# frozen_string_literal: true

require_relative './test_helper'

class TestManager < Minitest::Test

  def test_manager_example
    manager = Saro::Dat::DatManager.new

    cert = [Saro::Dat::DatCertificate.new(
      1,
      Time.now.to_i - 10,
      110,
      1800,
      Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::HMAC_SHA512_MFS),
      Saro::Dat::DatCrypto.generate(Saro::Dat::DatCryptoAlgorithm::IV_AES128_GCM)
    )]
    manager.import_certificates(cert)

    plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
    secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

    dat = manager.issue(plain, secure)
    puts "DAT : #{dat}"

    payload = manager.parse(dat)

    assert_equal plain, payload.plain
    assert_equal secure, payload.secure

    puts "plain : #{payload.plain}"
    puts "secure: #{payload.secure}"

  end
end
