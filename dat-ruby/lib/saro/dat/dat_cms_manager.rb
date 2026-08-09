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

      STOP_JOIN_TIMEOUT_SECONDS = 1.0

      def initialize(uri:, token:, interval_seconds: 60, verify_only: false, dat_manager: nil)
        @uri = uri
        @token = token
        @interval_seconds = interval_seconds
        @verify_only = verify_only
        @manager = dat_manager || DatManager.new
        @version = 0
        @lock = Mutex.new
        @lifecycle = Mutex.new
        @stop_cond = ConditionVariable.new
        @stopped = false
        @logger = Logger.new($stdout)
        @logger.level = Logger::DEBUG
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
          @stop_cond.broadcast
          thread = @thread
        end
        thread&.join(STOP_JOIN_TIMEOUT_SECONDS)
        nil
      end

      def stopped?
        @lifecycle.synchronize { @stopped }
      end

      attr_reader :last_error

      def version
        @version
      end

      def sync
        err = sync_or_raise
        @last_error = nil
        err
      rescue Saro::Dat::Error => e
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

      private def sync_or_raise
        unless @lock.try_lock
          @logger.debug("cms sync skipped, previous sync still running: #{@uri}")
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_SYNC_IN_PROGRESS)
        end

        begin
          url = URI("#{@uri}?version=#{@version}")
          request = Net::HTTP::Get.new(url)
          request["Authorization"] = @token

          response =
            begin
              Net::HTTP.start(url.host, url.port, use_ssl: url.scheme == 'https', open_timeout: 10, read_timeout: 10) do |http|
                http.request(request)
              end
            rescue StandardError => e
              raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_UNREACHABLE, "cannot reach #{@uri}", cause: e)
            end

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

          if new_version < @version
            @logger.warn("#{Saro::Dat::ErrorCode::CMS_VERSION_RESET}: #{@version} -> #{new_version}")
          end

          renew_count =
            begin
              @manager.imports(new_certificates, clear: false)
            rescue Saro::Dat::Error => e
              raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CMS_IMPORT_FAILED, "cannot apply received certificates", cause: e)
            end

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
