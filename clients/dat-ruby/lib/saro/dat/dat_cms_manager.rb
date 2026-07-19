# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'logger'
require 'thread'
require_relative 'dat_manager'
require_relative 'dat'

module Saro
  module Dat
    class DatCmsManager
      DAT_CMS_API_VERSION = "v1"

      def initialize(uri:, token:, interval_seconds: 60, verify_only: false, dat_manager: nil)
        @uri = uri
        @token = token
        @interval_seconds = interval_seconds
        @verify_only = verify_only
        @manager = dat_manager || DatManager.new
        @version = 0
        @lock = Mutex.new
        @stopped = false
        @logger = Logger.new($stdout)
        @logger.level = Logger::DEBUG

        sync

        if @interval_seconds > 0
          schedule_sync
        end
      end

      def stop
        @lock.synchronize do
          @stopped = true
          @thread&.kill # 혹은 다른 방식으로 스레드 중지
        end
      end

      def sync
        # non-blocking lock
        unless @lock.try_lock
          @logger.warn("Last request ignored (Duplicate request)")
          return
        end

        begin
          url = URI("#{@uri}?version=#{@version}")
          request = Net::HTTP::Get.new(url)
          request["Authorization"] = @token

          response = Net::HTTP.start(url.host, url.port, use_ssl: url.scheme == 'https', open_timeout: 10, read_timeout: 10) do |http|
            http.request(request)
          end

          if response.code != "200"
            @logger.error("Response status error, status:#{response.code} in #{url}")
            return
          end

          body = response.body
          if body.nil? || body.empty?
            @logger.debug("No new certificate: #{url}")
            return
          end

          lines = body.split("\n", 2)
          if lines.length < 2
            if body.start_with?("\n")
              @logger.error("Invalid response: #{url}")
              return
            end
            @logger.debug("No new certificate: #{url}")
            return
          end

          new_version_str = lines[0].strip
          new_certificates = lines[1].strip

          if new_version_str.empty?
            @logger.error("Invalid version in response: #{url}")
            return
          end

          begin
            new_version = Integer(new_version_str)
            renew_count = @manager.imports(new_certificates, clear: false)
            @version = new_version
            @logger.debug("Renewed #{renew_count} certificates for version #{new_version}: #{url}")
          rescue ArgumentError => e
            @logger.error("Failed to parse version or certificates: #{e.message}")
          end

        rescue StandardError => e
          @logger.error("[Exception] DAT CMS Sync #{@uri}: #{e.message}")
        ensure
          @lock.unlock
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
            sleep(@interval_seconds)
            break if @stopped
            run_sync_task
          end
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
        parsed = URI.parse(@uri)
        
        if parsed.path && parsed.path != '' && parsed.path != '/'
          raise ArgumentError, "uri must be path-less: #{@uri}"
        end
        if parsed.query
          raise ArgumentError, "uri must be query-less: #{@uri}"
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
