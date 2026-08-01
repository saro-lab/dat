# frozen_string_literal: true

require_relative 'error'
require_relative 'crypto'
require_relative 'signature'
require_relative 'util'

module Saro
  module Dat
    class DatCertificate
      attr_reader :cid, :signature_key, :crypto_key, :dat_issuance_start_seconds, :dat_issuance_end_seconds, :dat_ttl_seconds

      def initialize(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, signature_key, crypto_key)
        @cid = u64!("cid", cid)
        @dat_issuance_start_seconds = u64!("dat_issuance_start_seconds", dat_issuance_start_seconds)
        duration = u64!("dat_issuance_duration_seconds", dat_issuance_duration_seconds)
        @dat_ttl_seconds = u64!("dat_ttl_seconds", dat_ttl_seconds)
        # Ruby 정수는 자동으로 bignum 이 되므로 그냥 더하면 u64 를 넘겨도 조용히
        # 통과한다. 기준 구현(rust)의 checked_add 와 같은 경계를 여기서 강제한다.
        @dat_issuance_end_seconds = u64!(
          "dat_issuance_start_seconds + dat_issuance_duration_seconds",
          @dat_issuance_start_seconds + duration
        )
        u64!(
          "dat_issuance_start_seconds + dat_issuance_duration_seconds + dat_ttl_seconds",
          @dat_issuance_end_seconds + @dat_ttl_seconds
        )
        @signature_key = signature_key
        @crypto_key = crypto_key
      end

      def exports(verify_only = false)
        cid_hex = @cid.to_s(16)
        dat_issuance_start_seconds = @dat_issuance_start_seconds.to_s
        dat_issuance_duration_seconds = (@dat_issuance_end_seconds - @dat_issuance_start_seconds).to_s
        dat_ttl_seconds = @dat_ttl_seconds.to_s
        signature_algorithm = @signature_key.algorithm
        crypto_algorithm = @crypto_key.algorithm
        signature_key = @signature_key.exports(verify_only)
        crypto_key = @crypto_key.exports

        "#{cid_hex}.#{dat_issuance_start_seconds}.#{dat_issuance_duration_seconds}.#{dat_ttl_seconds}.#{signature_algorithm}.#{crypto_algorithm}.#{signature_key}.#{crypto_key}"
      end

      def self.generate(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, signature_algorithm, crypto_algorithm)
        new(
          cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
          Saro::Dat::DatSignature.generate(signature_algorithm),
          Saro::Dat::DatCrypto.generate(crypto_algorithm)
        )
      end

      def self.imports(format_str)
        parts = format_str.split(".")
        if parts.length != 8
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CERT_MALFORMED, "expected exactly 8 dot-separated fields")
        end

        # 필드 파싱 실패는 인증서가 깨진 것이지 호출자의 인자 문제가 아니다.
        cid = _field("cid") { Saro::Dat::Util.parse_u64_hex(parts[0]) }
        dat_issuance_start_seconds = _field("issuance_start_seconds") { Saro::Dat::Util.parse_u64(parts[1]) }
        dat_issuance_duration_seconds = _field("issuance_duration_seconds") { Saro::Dat::Util.parse_u64(parts[2]) }
        dat_ttl_seconds = _field("dat_ttl_seconds") { Saro::Dat::Util.parse_u64(parts[3]) }
        signature_algorithm = parts[4]
        crypto_algorithm = parts[5]
        signature_key = Saro::Dat::DatSignature.imports(signature_algorithm, parts[6])
        crypto_key = Saro::Dat::DatCrypto.imports(crypto_algorithm, parts[7])

        new(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, signature_key, crypto_key)
      end

      def issuable
        now = Time.now.to_i
        signable && @dat_issuance_start_seconds <= now && now <= @dat_issuance_end_seconds
      end

      def expired
        Time.now.to_i > (@dat_issuance_end_seconds + @dat_ttl_seconds)
      end

      def signable
        @signature_key.signable
      end

      def pair
        @signature_key.pair
      end

      def support_verify_only
        @signature_key.support_verify_only
      end

      U64_MAX = 0xFFFFFFFFFFFFFFFF
      private_constant :U64_MAX

      private def u64!(name, value)
        unless value.is_a?(Integer) && !value.is_a?(TrueClass) && value >= 0 && value <= U64_MAX
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CERT_MALFORMED, "#{name} must fit in u64: #{value}")
        end
        value
      end

      def self._field(name)
        yield
      rescue Saro::Dat::Error => e
        raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CERT_MALFORMED, "#{name} field is not a plain number", cause: e)
      end
      private_class_method :_field

      # For Ruby conventions
      alias_method :issuable?, :issuable
      alias_method :expired?, :expired
      alias_method :signable?, :signable
      alias_method :pair?, :pair
    end
  end
end
