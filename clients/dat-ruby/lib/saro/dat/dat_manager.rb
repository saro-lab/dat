# frozen_string_literal: true

require 'set'
require_relative 'dat_certificate'
require_relative 'dat'
require_relative 'signature'
require_relative 'util'

module Saro
  module Dat
    class DatManager
      # Immutable snapshot of the manager state.
      # Readers access it lock-free via a single ivar read (atomic reference swap);
      # writers rebuild a new frozen snapshot under @write_lock.
      State = Struct.new(:issuer, :certificates, :by_cid)

      EMPTY_STATE = State.new(nil, [].freeze, {}.freeze).freeze
      private_constant :EMPTY_STATE

      def initialize
        @state = EMPTY_STATE
        @write_lock = Mutex.new
      end

      def import_certificates(input_certs, clear: false)
        renew_count = 0
        @write_lock.synchronize do
          certificates = clear ? [] : @state.certificates.dup

          before_cids = Set.new(certificates.map(&:cid))
          seen_cids = Set.new

          input_certs.each do |cert|
            raise ArgumentError, "Duplicate CID: #{cert.cid}" if seen_cids.include?(cert.cid)
            seen_cids.add(cert.cid)
            next if cert.expired
            next if before_cids.include?(cert.cid)

            certificates << cert
            renew_count += 1
          end

          certificates.sort_by!(&:dat_issuance_end_seconds)

          # Find latest issuable certificate as issuer
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
        issuer = @state.issuer
        raise RuntimeError, "Invalid DAT: Signing Key Does Not Exist" unless issuer

        self.class._issue(issuer, plain, secure)
      end

      def parse(dat_input)
        dat = Saro::Dat::Dat.from_value(dat_input)
        raise ArgumentError, "Invalid DAT: Format" unless dat.format

        certificate = @state.by_cid[dat.cid]

        raise ArgumentError, "Invalid DAT: CID(Certificate ID) Not Found" unless certificate

        self.class._parse(certificate, dat)
      end

      private

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
        raise RuntimeError, "Invalid DAT: Format" unless dat.format
        raise RuntimeError, "Invalid DAT: Expired" if dat.expired?

        unless cert.signature_key.verify(dat.body_string, dat.signature)
          raise RuntimeError, "Invalid DAT: Signature"
        end

        decrypted_secure = cert.crypto_key.decrypt(dat.secure)
        Saro::Dat::DatPayload.new(dat.plain, decrypted_secure)
      end
    end
  end
end
