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
        # rust returns early on an empty input without touching the state, so an
        # empty CMS response can never wipe the certificates held by a manager
        # that is importing with clear: true.
        return 0 if input_certs.nil? || input_certs.empty?

        # Duplicate detection runs before any mutation (rust checks the whole
        # input up front), so a bad payload cannot leave a half-applied state.
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

          # Expired certificates are dropped from the *merged* list, not just
          # from the incoming one, so a renewal sweeps out what has aged out.
          certificates.reject!(&:expired)
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
        state = @state
        issuer = state.issuer
        unless issuer
          # 예전에는 이 다섯 가지가 "Invalid DAT: Signing Key Does Not Exist"
          # 문자열 하나였다. 대응이 전부 다르다 — 발급창 전이면 기다리면 되고,
          # verify-only 뿐이면 배포 설정 실수이며, 0건이면 CMS 접속 문제다.
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
        # 파싱 실패의 코드를 그대로 올린다.
        dat.raise_if_invalid!

        # 만료를 cid 조회보다 먼저 본다. 기준 구현(rust)이 토큰을 읽는 시점에
        # 만료를 판정하므로, 모르는 cid 의 만료 토큰도 만료로 보고된다.
        raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_EXPIRED) if dat.expired?

        certificate = @state.by_cid[dat.cid]
        unless certificate
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CERT_NOT_FOUND, "cid #{dat.cid.to_s(16)}")
        end

        self.class._parse(certificate, dat)
      end

      # 발급 가능한 인증서가 없을 때 왜 없는지 가려낸다.
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
            # 기다리면 풀리는 유일한 사유다. 하나라도 있으면 이것을 앞세운다.
            Saro::Dat::ErrorCode::CERT_NOT_YET_ISSUABLE
          elsif ended
            Saro::Dat::ErrorCode::CERT_ISSUANCE_ENDED
          else
            Saro::Dat::ErrorCode::CERT_EXPIRED
          end
        Saro::Dat::Error.new(code)
      end

      # NOTE: 아래 `private` 는 `def self.` 메서드에 적용되지 않는다. _issue/_parse 는
      # 예전부터 실제로는 public 이었고 테스트·벤치가 그렇게 쓰고 있다. 오해를 없애려
      # 위치를 옮기고, 정말 감춰야 하는 것만 private_class_method 로 막는다.

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
        # 같은 조건이 여기서는 RuntimeError, DatManager#parse 에서는 ArgumentError
        # 였다. 이제 양쪽 모두 같은 코드를 던진다.
        dat.raise_if_invalid!
        raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::TOKEN_EXPIRED) if dat.expired?

        # verify 는 불일치일 때만 false 를 준다. 연산 실패는 SIG_BACKEND 로 올라온다.
        unless cert.signature_key.verify(dat.body_string, dat.signature)
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::SIG_MISMATCH)
        end

        decrypted_secure = cert.crypto_key.decrypt(dat.secure)
        Saro::Dat::DatPayload.new(dat.plain, decrypted_secure)
      end
    end
  end
end
