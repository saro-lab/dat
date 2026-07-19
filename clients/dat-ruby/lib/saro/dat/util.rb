# frozen_string_literal: true

require 'base64'

module Saro
  module Dat
    module Util
      module_function

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
        
        # More robust way for older Ruby
        s = s.to_s.tr('-_', '+/')
        rem = s.bytesize % 4
        s += ("=" * (4 - rem)) if rem > 0

        Base64.decode64(s).b
      end

      def decode_base64_url_str(s)
        decode_base64_url(s).force_encoding('utf-8')
      end
    end
  end
end
