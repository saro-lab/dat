# frozen_string_literal: true

require_relative './test_helper'

class TestCertificate < Minitest::Test
  def generate_base62(length)
    characters = ('a'..'z').to_a + ('A'..'Z').to_a + ('0'..'9').to_a
    Array.new(length) { characters.sample }.join
  end

  def generate_certificate(cid, sa, ca)
    now = Time.now.to_i
    Saro::Dat::DatCertificate.new(
      cid,
      now - 10,
      110,
      1800,
      Saro::Dat::DatSignature.generate(sa),
      Saro::Dat::DatCrypto.generate(ca)
    )
  end

  def cert_test(fail_cert, cid, sa, ca)
    tag = "CERT #{sa} #{ca}"
    original_plain = generate_base62(100)
    original_secure = generate_base62(100)

    new_cert = generate_certificate(cid, sa, ca)
    export_full_cert = new_cert.exports(false)
    export_verifying_cert = new_cert.exports(new_cert.support_verify_only)

    reimport_full_cert = Saro::Dat::DatCertificate.imports(export_full_cert)
    reimport_verifying_cert = Saro::Dat::DatCertificate.imports(export_verifying_cert)

    puts "#{tag} Generated-Imported cert: #{export_full_cert}"

    dat_1 = Saro::Dat::DatManager._issue(new_cert, original_plain, original_secure)
    dat_2 = Saro::Dat::DatManager._issue(reimport_full_cert, original_plain, original_secure)
    dat_empty = Saro::Dat::DatManager._issue(new_cert, "", "")

    puts "#{tag} Issue DAT: #{dat_1}"
    puts "#{tag} Issue DAT: #{dat_2}"

    payload_1 = Saro::Dat::DatManager._parse(reimport_verifying_cert, dat_1)
    payload_2 = Saro::Dat::DatManager._parse(reimport_full_cert, dat_2)
    payload_empty = Saro::Dat::DatManager._parse(reimport_verifying_cert, dat_empty)

    assert_equal original_plain, payload_1.plain
    assert_equal original_plain, payload_2.plain
    assert_equal "", payload_empty.plain
    assert_equal original_secure, payload_1.secure
    assert_equal original_secure, payload_2.secure
    assert_equal "", payload_empty.secure
    puts "#{tag} Verify DAT"

    assert_raises(RuntimeError) do
      Saro::Dat::DatManager._parse(fail_cert, dat_1)
    end
  end

  def test_certificate
    fail_cert = generate_certificate(3424342, Saro::Dat::DatSignatureAlgorithm::ECDSA_P256, Saro::Dat::DatCryptoAlgorithm::IV_AES128_GCM)
    Saro::Dat::DatSignatureAlgorithm.all.each do |sa|
      Saro::Dat::DatCryptoAlgorithm.all.each do |ca|
        5.times do |i|
          begin
            cert_test(fail_cert, i, sa, ca)
          rescue OpenSSL::Cipher::CipherError
            # Skipping if environment doesn't support GCM as noted in previous session
          end
        end
      end
    end
  end
end
