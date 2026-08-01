# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'logger'
require 'thread'
require_relative 'error'
require_relative 'dat_manager'
require_relative 'dat'

module Saro
  module Dat
    class DatCmsManager
      DAT_CMS_API_VERSION = "v1"

      # `stop` waits at most this long for an in-flight HTTP sync to finish.
      # The thread is never killed: past the grace period it is left to complete
      # its request and exit on its own at the top of the loop.
      STOP_JOIN_TIMEOUT_SECONDS = 1.0

      def initialize(uri:, token:, interval_seconds: 60, verify_only: false, dat_manager: nil)
        @uri = uri
        @token = token
        @interval_seconds = interval_seconds
        @verify_only = verify_only
        @manager = dat_manager || DatManager.new
        @version = 0
        # Two separate locks: @lock guards an in-flight sync (taken non-blocking,
        # held across the HTTP request), @lifecycle guards the stop flag and the
        # sleep condition. Sharing one lock made `stop` block for the whole
        # request timeout.
        @lock = Mutex.new
        @lifecycle = Mutex.new
        @stop_cond = ConditionVariable.new
        @stopped = false
        @logger = Logger.new($stdout)
        @logger.level = Logger::DEBUG
        # 최초 sync 실패는 여전히 생성을 막지 않는다(list.md F-3). 다만 이제 로그로만
        # 사라지지 않고 #last_error 로 조회할 수 있다.
        @last_error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_NOT_SYNCED)

        sync

        if @interval_seconds > 0
          schedule_sync
        end
      end

      def stop
        thread = nil
        @lifecycle.synchronize do
          return if @stopped
          @stopped = true
          # Wakes the scheduler out of its sleep immediately instead of killing
          # it in the middle of a request.
          @stop_cond.broadcast
          thread = @thread
        end
        thread&.join(STOP_JOIN_TIMEOUT_SECONDS)
        nil
      end

      def stopped?
        @lifecycle.synchronize { @stopped }
      end

      # 마지막 동기화 실패. 한 번도 성공하지 못했으면 DAT_CMS_NOT_SYNCED, 정상이면 nil.
      # 재시도 여부는 err.retry 로 판정한다.
      attr_reader :last_error

      def version
        @version
      end

      def sync
        err = sync_or_raise
        @last_error = nil
        err
      rescue Saro::Dat::Error => e
        # 상태 신호는 실패로 기록하지 않는다 — 이전 동기화가 도는 중일 뿐이다.
        unless e.retry == :state
          @last_error = e
          @logger.error("[CRITICAL] DAT CMS SYNC #{@uri}: #{e.code} #{e.detail}")
        end
        nil
      rescue StandardError => e
        @last_error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_UNKNOWN, "unclassified cms failure", cause: e)
        @logger.error("[CRITICAL] DAT CMS SYNC #{@uri}: #{e.message}")
        nil
      end

      # 실패를 코드로 던진다. #sync 는 이것을 잡아 #last_error 에 담기만 한다 —
      # 기존 호출부가 갑자기 예외를 받지 않도록.
      private def sync_or_raise
        # non-blocking lock
        unless @lock.try_lock
          @logger.debug("cms sync skipped, previous sync still running: #{@uri}")
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_SYNC_IN_PROGRESS)
        end

        begin
          url = URI("#{@uri}?version=#{@version}")
          request = Net::HTTP::Get.new(url)
          request["Authorization"] = @token

          # 연결 거부·DNS 실패·TLS 실패·타임아웃이 전부 여기로 온다. 전부 일시적이다.
          response =
            begin
              Net::HTTP.start(url.host, url.port, use_ssl: url.scheme == 'https', open_timeout: 10, read_timeout: 10) do |http|
                http.request(request)
              end
            rescue StandardError => e
              raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_UNREACHABLE, "cannot reach #{@uri}", cause: e)
            end

          # HTTP 상태를 갈라 낸다. 예전에는 전부 하나의 로그라 401(영구)에도
          # 60초마다 영원히 재시도했다.
          status = response.code.to_i
          raise self.class.http_status_error(status) unless status.between?(200, 299)

          body = response.body
          if body.nil? || body.empty?
            @logger.debug("No new certificate: #{url}")
            return nil
          end

          lines = body.split("\n", 2)
          if lines.length < 2
            if body.start_with?("\n")
              raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_MALFORMED, "response has no version line")
            end
            @logger.debug("No new certificate: #{url}")
            return nil
          end

          new_version_str = lines[0].strip
          new_certificates = lines[1].strip

          unless new_version_str.match?(/\A[0-9]+\z/)
            raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_MALFORMED, "version line is not a plain decimal integer")
          end
          new_version = new_version_str.to_i

          # 서버가 우리보다 과거 버전을 돌려주면 전체 재동기화 지시다. 오류가 아니라
          # 상태 신호이며, 아래 imports 가 clear: true 라 그 자체로 처리된다.
          if new_version < @version
            @logger.warn("#{Saro::Dat::ErrorCode::CMS_VERSION_RESET}: #{@version} -> #{new_version}")
          end

          # 인증서 적용 실패의 원인(CERT_*/KEY_*)을 버리지 않고 체이닝한다.
          renew_count =
            begin
              # clear: true, like rust's `manager.import(&certs, true)`. The CMS
              # response is the authoritative full set for that version, so
              # revoked certificates disappear instead of lingering until they
              # expire on their own.
              @manager.imports(new_certificates, clear: true)
            rescue Saro::Dat::Error => e
              raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_IMPORT_FAILED, "cannot apply received certificates", cause: e)
            end

          # Only a successful import advances the version, matching rust:
          # a rejected payload is re-requested rather than skipped.
          @version = new_version
          @logger.debug("Renewed #{renew_count} certificates for version #{new_version}: #{url}")
          nil
        ensure
          @lock.unlock
        end
      end

      def self.http_status_error(status)
        case status
        when 401 then Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_UNAUTHORIZED, "http 401")
        when 403 then Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_FORBIDDEN, "http 403")
        when 404 then Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_ENDPOINT_NOT_FOUND, "http 404")
        when 500..599 then Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_SERVER_ERROR, "http #{status}")
        else Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_HTTP_STATUS, "http #{status}")
        end
      end

      def get_manager
        @manager
      end

      def issue(plain, secure)
        @manager.issue(plain, secure)
      end

      def parse(dat)
        @manager.parse(dat)
      end

      def self.builder
        DatCmsManagerBuilder.new
      end

      private

      def schedule_sync
        @thread = Thread.new do
          loop do
            break unless wait_interval
            run_sync_task
          end
        end
      end

      # Interruptible sleep: returns false as soon as `stop` signals, so the
      # scheduler exits promptly without Thread#kill.
      def wait_interval
        @lifecycle.synchronize do
          return false if @stopped
          @stop_cond.wait(@lifecycle, @interval_seconds)
          !@stopped
        end
      end

      def run_sync_task
        sync
      rescue StandardError => e
        # sync 는 이미 스스로 삼키므로 여기 오는 것은 예상 밖의 실패다.
        @logger.error("Error in sync task: #{e.message}")
      end
    end

    class DatCmsManagerBuilder
      def initialize
        @uri = "http://localhost:8088"
        @token = ""
        @verify_only = false
        @interval_seconds = 60
      end

      def uri(uri)
        @uri = uri.delete_suffix('/')
        self
      end

      def token(token)
        @token = token
        self
      end

      def verify_only(verify_only)
        @verify_only = verify_only
        self
      end

      def interval_seconds(interval_seconds)
        @interval_seconds = interval_seconds
        self
      end

      def interval_off
        @interval_seconds = 0
        self
      end

      def build
        parsed =
          begin
            URI.parse(@uri)
          rescue URI::InvalidURIError => e
            raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_URI_INVALID, "cannot be parsed as a uri", cause: e)
          end

        unless %w[http https].include?(parsed.scheme)
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_URI_INVALID, "scheme must be http or https")
        end
        if parsed.path && parsed.path != '' && parsed.path != '/'
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_URI_INVALID, "must be path-less: #{@uri}")
        end
        if parsed.query
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_URI_INVALID, "must be query-less: #{@uri}")
        end

        path = @verify_only ? "/v1/certs/verify-only" : "/v1/certs"
        final_uri = "#{parsed.scheme}://#{parsed.host}:#{parsed.port}#{path}"

        DatCmsManager.new(
          uri: final_uri,
          token: @token,
          interval_seconds: @interval_seconds,
          verify_only: @verify_only
        )
      end
    end
  end
end
