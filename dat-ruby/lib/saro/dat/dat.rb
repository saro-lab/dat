# frozen_string_literal: true

require_relative 'error'
require_relative 'util'

module Saro
  module Dat
    class Dat
      attr_reader :dat, :expire, :cid, :plain, :secure, :signature, :format

      attr_reader :error

      def initialize(dat_str)
        @dat = dat_str || ''
        @format = false
        @expire = 0
        @cid = 0
        @plain = "".b
        @secure = "".b
        @signature = "".b
        @error = nil

        if @dat.empty?
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_MALFORMED, "token is empty")
          return
        end

        parts = @dat.split('.', -1)
        if parts.length != 5
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_MALFORMED, "expected exactly 5 dot-separated fields")
          return
        end

        begin
          @expire = Saro::Dat::Util.parse_u64(parts[0])
        rescue Saro::Dat::Error => e
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_MALFORMED, "expire field is not a plain decimal u64", cause: e)
          return
        end

        begin
          @cid = Saro::Dat::Util.parse_u64_hex(parts[1])
        rescue Saro::Dat::Error => e
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_MALFORMED, "cid field is not a plain hex u64", cause: e)
          return
        end

        begin
          @plain = Saro::Dat::Util.decode_base64_url(parts[2])
        rescue Saro::Dat::Error => e
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_MALFORMED, "plain field is not base64url", cause: e)
          return
        end

        begin
          @secure = Saro::Dat::Util.decode_base64_url(parts[3])
        rescue Saro::Dat::Error => e
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_MALFORMED, "secure field is not base64url", cause: e)
          return
        end

        if parts[4].empty?
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::SIG_MALFORMED, "signature field is empty")
          return
        end

        begin
          @signature = Saro::Dat::Util.decode_base64_url(parts[4])
        rescue Saro::Dat::Error => e
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::SIG_MALFORMED, "signature field is not base64url", cause: e)
          return
        end

        if @signature.empty?
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::SIG_MALFORMED, "signature field is empty")
          return
        end

        @format = true
      end

      def raise_if_invalid!
        raise @error if @error
        nil
      end

      def self.from_value(value)
        return value if value.is_a?(Dat)
        new(value)
      end

      def expired
        return true unless @format
        Time.now.to_i >= @expire
      end

      alias_method :expired?, :expired

      def body_string
        idx = @dat.rindex('.')
        return "" unless idx
        @dat[0, idx]
      end
    end

    class DatPayload
      attr_reader :plain_bytes, :secure_bytes

      def initialize(plain, secure)
        @plain_bytes = plain
        @secure_bytes = secure
      end

      def plain
        @plain_bytes.force_encoding('utf-8')
      end

      def secure
        @secure_bytes.force_encoding('utf-8')
      end

      def to_s
        "#{Saro::Dat::Util.encode_base64_url_str(@plain_bytes)} #{Saro::Dat::Util.encode_base64_url_str(@secure_bytes)}"
      end

      def to_unsafe_string
        "#{plain} #{secure}"
      end
    end
  end
end
