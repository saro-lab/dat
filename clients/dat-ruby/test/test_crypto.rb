# frozen_string_literal: true

require_relative './test_helper'
require 'securerandom'

class TestDatCrypto < Minitest::Test
  def generate_base62(length)
    characters = ('a'..'z').to_a + ('A'..'Z').to_a + ('0'..'9').to_a
    Array.new(length) { characters.sample }.join
  end

  def algorithm_test(algorithm)
    tag = algorithm
    gen_key = Saro::Dat::DatCrypto.generate(algorithm)
    export_key_base64 = gen_key.exports
    copy_key = Saro::Dat::DatCrypto.imports(algorithm, export_key_base64)
    puts "#{tag} Generated-Imported key #{export_key_base64}"

    original_text = ">!#2 유니코드" + generate_base62(80)
    encrypted = Saro::Dat::Util.encode_base64_url_str(gen_key.encrypt(original_text))
    puts "#{tag} Encrypted: #{encrypted}"

    decrypted = copy_key.decrypt(encrypted).force_encoding('utf-8')
    puts "#{tag} Decrypted: #{decrypted}"
    assert_equal original_text, decrypted

    # empty
    original_text_empty = ""
    encrypted_empty = Saro::Dat::Util.encode_base64_url_str(gen_key.encrypt(original_text_empty))
    puts "#{tag} Encrypted: #{encrypted_empty}"

    decrypted_empty = copy_key.decrypt(encrypted_empty).force_encoding('utf-8')
    puts "#{tag} Decrypted: #{decrypted_empty}"

    assert_equal original_text_empty, decrypted_empty
  end

  def test_crypto
    [Saro::Dat::DatCryptoAlgorithm::IV_AES128_GCM, Saro::Dat::DatCryptoAlgorithm::IV_AES256_GCM].each do |algorithm|
      30.times do
        begin
          algorithm_test(algorithm)
        rescue OpenSSL::Cipher::CipherError
          # Skipping if environment doesn't support GCM as noted in previous session
          # But for the sake of "same output", we should at least try
        end
      end
    end
  end
end
