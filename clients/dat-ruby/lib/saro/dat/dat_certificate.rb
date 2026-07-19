# frozen_string_literal: true

require_relative 'crypto'
require_relative 'signature'
require_relative 'util'

module Saro
  module Dat
    class DatCertificate
      attr_reader :cid, :signature_key, :crypto_key, :dat_issuance_start_seconds, :dat_issuance_end_seconds, :dat_ttl_seconds

      def initialize(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds, signature_key, crypto_key)
        @cid = cid
        @dat_issuance_start_seconds = dat_issuance_start_seconds
        @dat_issuance_end_seconds = dat_issuance_start_seconds + dat_issuance_duration_seconds
        @dat_ttl_seconds = dat_ttl_seconds
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
        raise ArgumentError, "Invalid Certificate format" if parts.length != 8

        cid = parts[0].to_i(16)
        dat_issuance_start_seconds = parts[1].to_i
        dat_issuance_duration_seconds = parts[2].to_i
        dat_ttl_seconds = parts[3].to_i
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

      # For Ruby conventions
      alias_method :issuable?, :issuable
      alias_method :expired?, :expired
      alias_method :signable?, :signable
      alias_method :pair?, :pair
    end
  end
end
