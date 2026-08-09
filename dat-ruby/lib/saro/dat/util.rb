# frozen_string_literal: true

require 'base64'
require_relative 'error'

module Saro
  module Dat
    module Util
      module_function

      U64_MAX = 0xFFFFFFFFFFFFFFFF

      def parse_u64(s)
        unless s.is_a?(String) && s.match?(/\A[0-9]+\z/)
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_ARGUMENT_INVALID, "not an unsigned decimal integer: #{s.inspect}")
        end
        v = s.to_i
        if v > U64_MAX
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_ARGUMENT_INVALID, "exceeds u64: #{s.inspect}")
        end
        v
      end

      def parse_u64_hex(s)
        unless s.is_a?(String) && s.match?(/\A[0-9a-fA-F]+\z/)
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_ARGUMENT_INVALID, "not an unsigned hex integer: #{s.inspect}")
        end
        v = s.to_i(16)
        if v > U64_MAX
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_ARGUMENT_INVALID, "exceeds u64: #{s.inspect}")
        end
        v
      end

      def encode_base64_url(s)
        return "".b if s.nil?
        if s.is_a?(String)
          return "".b if s.empty?
          enc = s.encoding
          s = s.encode('utf-8') unless enc == Encoding::BINARY || enc == Encoding::UTF_8
        end
        Base64.urlsafe_encode64(s, padding: false).b
      end

      def encode_base64_url_str(s)
        encode_base64_url(s).force_encoding('ascii')
      end

      def decode_base64_url(s)
        return "".b if s.nil?
        if s.is_a?(String)
          return "".b if s.empty?
        end
        
        s = s.to_s
        rem = s.bytesize % 4
        s += ("=" * (4 - rem)) if rem > 0

        begin
          Base64.urlsafe_decode64(s).b
        rescue ArgumentError => e
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_ARGUMENT_INVALID, "not a valid base64url string", cause: e)
        end
      end

      def decode_base64_url_str(s)
        decode_base64_url(s).force_encoding('utf-8')
      end
    end
  end
end
