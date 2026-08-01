# frozen_string_literal: true

require_relative 'error'
require_relative 'util'

module Saro
  module Dat
    class Dat
      attr_reader :dat, :expire, :cid, :plain, :secure, :signature, :format

      # 파싱이 실패한 이유. 성공이면 nil 이다.
      #
      # 예전에는 빈 `rescue StandardError` 가 모든 실패를 삼키고 @format=false
      # 하나만 남겼다. 어느 필드가 왜 틀렸는지가 전부 사라져 호출부는
      # "Invalid DAT: Format" 밖에 볼 수 없었다.
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

        # 1) 먼저 구조를 확정한다. 파트가 5개가 아니면 그건 만료된 토큰이 아니라
        #    애초에 토큰이 아니다.
        #    split 의 limit 을 -1 로 준다: 기본값은 뒤쪽 빈 필드를 버려서
        #    "a.b.c.d.e." (6필드) 가 5파트로 보였고, 빈 서명("a.b.c.d.")은
        #    4파트로 보여 서명 오류를 구조 오류로 오인하게 만들었다.
        parts = @dat.split('.', -1)
        if parts.length != 5
          @error = Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_MALFORMED, "expected exactly 5 dot-separated fields")
          return
        end

        # 2) 구조가 맞은 뒤에야 값을 본다. 필드마다 어디서 틀렸는지 코드를 붙인다.
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

        # 빈 서명은 구조 오류가 아니라 서명 오류다 (error.pre2.md: DAT_SIG_MALFORMED
        # 가 "빈 서명"을 포함한다). 위조(SIG_MISMATCH)와도 구분된다.
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

      # 파싱에 실패했으면 그 코드로 던진다.
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
