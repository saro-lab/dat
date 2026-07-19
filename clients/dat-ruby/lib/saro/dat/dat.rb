# frozen_string_literal: true

require_relative 'util'

module Saro
  module Dat
    class Dat
      attr_reader :dat, :expire, :cid, :plain, :secure, :signature, :format

      def initialize(dat_str)
        @dat = dat_str || ''
        @format = false
        @expire = 0
        @cid = 0
        @plain = "".b
        @secure = "".b
        @signature = "".b

        if !@dat.empty?
          parts = @dat.split('.')
          if parts.length == 5
            begin
              @expire = parts[0].to_i
              @cid = parts[1].to_i(16)
              @plain = Saro::Dat::Util.decode_base64_url(parts[2])
              @secure = Saro::Dat::Util.decode_base64_url(parts[3])
              @signature = Saro::Dat::Util.decode_base64_url(parts[4])
              @format = (!@signature.empty? && @expire >= 0)
            rescue StandardError
              @format = false
            end
          end
        end
      end

      def self.from_value(value)
        return value if value.is_a?(Dat)
        new(value)
      end

      def expired
        return true unless @format
        Time.now.to_i > @expire
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
