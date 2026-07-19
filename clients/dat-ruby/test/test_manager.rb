# frozen_string_literal: true

require_relative './test_helper'

class TestManager < Minitest::Test
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

  def test_manager
    original_plain = generate_base62(100)
    original_secure = generate_base62(100)
    dat_list = []
    manager = Saro::Dat::DatManager.new

    i = 0
    Saro::Dat::DatSignatureAlgorithm.all.each do |sa|
      Saro::Dat::DatCryptoAlgorithm.all.each do |ca|
        10.times do
          begin
            i += 1
            cert = generate_certificate(i, sa, ca)
            manager.import_certificates([cert], clear: false)
            dat = Saro::Dat::DatManager._issue(cert, original_plain, original_secure)
            dat_list << dat
          rescue OpenSSL::Cipher::CipherError
          end
        end
      end
    end

    puts "DAT Manager Import : #{dat_list.length} Certificates"

    manager_full_export = manager.exports(false)

    reimport_full_manager = Saro::Dat::DatManager.new
    reimport_full_manager.imports(manager_full_export)

    begin
      dat_list << reimport_full_manager.issue(original_plain, original_secure)
    rescue OpenSSL::Cipher::CipherError
    end


    puts "DAT Manager Re-Import"
    puts "ISSUE #{dat_list.length} DAT"

    dat_list.each do |dat|
      dat1 = manager.parse(dat)
      dat4 = reimport_full_manager.parse(dat)
      assert_equal original_plain, dat1.plain
      assert_equal original_secure, dat1.secure
      assert_equal original_plain, dat4.plain
      assert_equal original_secure, dat4.secure
      puts "PARSE DAT: #{dat}"
    end
  end
end
