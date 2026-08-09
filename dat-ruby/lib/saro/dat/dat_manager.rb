# frozen_string_literal: true

require 'set'
require_relative 'error'
require_relative 'dat_certificate'
require_relative 'dat'
require_relative 'signature'
require_relative 'util'

module Saro
  module Dat
    class DatManager
      State = Struct.new(:issuer, :certificates, :by_cid)

      EMPTY_STATE = State.new(nil, [].freeze, {}.freeze).freeze
      private_constant :EMPTY_STATE

      def initialize
        @state = EMPTY_STATE
        @write_lock = Mutex.new
      end

      def import_certificates(input_certs, clear: false)
        return 0 if input_certs.nil? || input_certs.empty?

        seen_cids = Set.new
        input_certs.each do |cert|
          if seen_cids.include?(cert.cid)
            raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CERT_DUPLICATE_CID, "duplicate cid #{cert.cid.to_s(16)}")
          end
          seen_cids.add(cert.cid)
        end

        renew_count = 0
        @write_lock.synchronize do
          certificates = clear ? [] : @state.certificates.dup

          cids = Set.new(certificates.map(&:cid))

          input_certs.each do |cert|
            next if cids.include?(cert.cid)

            cids.add(cert.cid)
            certificates << cert
            renew_count += 1
          end

          certificates.reject!(&:expired)
          certificates.sort_by!(&:dat_issuance_end_seconds)

          issuer = certificates.reverse_each.find(&:issuable)

          by_cid = {}
          certificates.each { |cert| by_cid[cert.cid] = cert }

          @state = State.new(issuer, certificates.freeze, by_cid.freeze).freeze
        end
        renew_count
      end

      def imports(format_str, clear: false)
        certs = []
        format_str.strip.split("\n").each do |line|
          line = line.strip
          next if line.empty?
          certs << Saro::Dat::DatCertificate.imports(line)
        end
        import_certificates(certs, clear: clear)
      end

      def exports(verify_only = false)
        @state.certificates.map { |cert| cert.exports(verify_only) }.join("\n")
      end

      def issue(plain, secure)
        state = @state
        issuer = state.issuer
        unless issuer
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::MANAGER_NO_CERTIFICATE) if state.certificates.empty?
          raise Saro::Dat::Error.new(
            Saro::Dat::ErrorCode::MANAGER_NO_ISSUABLE_CERTIFICATE,
            cause: no_issuable_cause(state.certificates)
          )
        end

        self.class._issue(issuer, plain, secure)
      end

      def parse(dat_input)
        dat = Saro::Dat::Dat.from_value(dat_input)
        dat.raise_if_invalid!

        raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_EXPIRED) if dat.expired?

        certificate = @state.by_cid[dat.cid]
        unless certificate
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CERT_NOT_FOUND, "cid #{dat.cid.to_s(16)}")
        end

        self.class._parse(certificate, dat)
      end

      private def no_issuable_cause(certificates)
        now = Time.now.to_i
        signable_seen = false
        not_yet = false
        ended = false

        certificates.each do |cert|
          next unless cert.signable
          signable_seen = true
          if now < cert.dat_issuance_start_seconds
            not_yet = true
          elsif now > cert.dat_issuance_end_seconds
            ended = true
          end
        end

        code =
          if !signable_seen
            Saro::Dat::ErrorCode::CERT_VERIFY_ONLY
          elsif not_yet
            Saro::Dat::ErrorCode::CERT_NOT_YET_ISSUABLE
          elsif ended
            Saro::Dat::ErrorCode::CERT_ISSUANCE_ENDED
          else
            Saro::Dat::ErrorCode::CERT_EXPIRED
          end
        Saro::Dat::Error.new(code)
      end

      def self._issue(cert, plain, secure)
        now = Time.now.to_i
        expire = now + cert.dat_ttl_seconds
        cid_hex = cert.cid.to_s(16)

        plain_b64 = Saro::Dat::Util.encode_base64_url_str(plain)

        encrypted_secure = cert.crypto_key.encrypt(secure)
        secure_b64 = Saro::Dat::Util.encode_base64_url_str(encrypted_secure)

        body = "#{expire}.#{cid_hex}.#{plain_b64}.#{secure_b64}"
        signature = Saro::Dat::Util.encode_base64_url_str(cert.signature_key.sign(body))

        "#{body}.#{signature}"
      end

      def self._parse(cert, dat_input)
        dat = Saro::Dat::Dat.from_value(dat_input)
        dat.raise_if_invalid!
        raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_EXPIRED) if dat.expired?

        unless cert.signature_key.verify(dat.body_string, dat.signature)
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::SIG_MISMATCH)
        end

        decrypted_secure = cert.crypto_key.decrypt(dat.secure)
        Saro::Dat::DatPayload.new(dat.plain, decrypted_secure)
      end
    end
  end
end
