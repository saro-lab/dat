# frozen_string_literal: true

require_relative './test_helper'

class TestExamplePorted < Minitest::Test
  def test_issue_and_parse
    dat_manager = Saro::Dat::DatManager.new

    # create certificate
    now = Time.now.to_i
    cert = Saro::Dat::DatCertificate.new(
      0,
      now - 10,
      20,
      1800,
      Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::ECDSA_P256),
      Saro::Dat::DatCrypto.generate(Saro::Dat::DatCryptoAlgorithm::IV_AES256_GCM)
    )

    puts cert.exports(false)

    # import certificate
    dat_manager.import_certificates([cert])

    example_plain = "plain text = 평문"
    example_secure = "secure = 암호문"

    begin
      dat = dat_manager.issue(example_plain, example_secure)
      payload = dat_manager.parse(dat)

      assert_equal example_plain, payload.plain
      assert_equal example_secure, payload.secure
      puts "PARSE DAT: #{dat}"
      puts "plain: #{payload.plain}"
      puts "secure: #{payload.secure}"
    rescue OpenSSL::Cipher::CipherError
      # Skip if GCM is not supported
    end
  end

end
