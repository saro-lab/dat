# frozen_string_literal: true

require_relative './test_helper'

class TestSignature < Minitest::Test
  def generate_base62(length)
    characters = ('a'..'z').to_a + ('A'..'Z').to_a + ('0'..'9').to_a
    Array.new(length) { characters.sample }.join
  end

  def algorithm_test(algorithm)
    tag = algorithm
    gen_key = Saro::Dat::DatSignature.generate(algorithm)

    export_key_pair = gen_key.exports(false)
    export_key_verifying = gen_key.exports(gen_key.support_verify_only)

    copy_export_key_pair = Saro::Dat::DatSignature.imports(algorithm, export_key_pair)
    copy_export_key_verifying = Saro::Dat::DatSignature.imports(algorithm, export_key_verifying)

    puts "#{tag} Generated-Imported key: #{export_key_pair}"

    original_text = ">!#2 유니코드" + generate_base62(80)
    sign1 = gen_key.sign(original_text)
    sign2 = copy_export_key_pair.sign(original_text)

    assert gen_key.verify(original_text, sign1)
    assert copy_export_key_pair.verify(original_text, sign2)
    assert copy_export_key_verifying.verify(original_text, sign1)
    assert !copy_export_key_verifying.verify("".b, sign1)

    puts "#{tag} Signing-Verify key"
  end

  def test_signature
    Saro::Dat::DatSignatureAlgorithm.all.each do |algorithm|
      10.times do
        algorithm_test(algorithm)
      end
    end
  end
end
