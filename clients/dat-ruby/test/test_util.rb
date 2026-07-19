# frozen_string_literal: true

require_relative './test_helper'

class TestUtil < Minitest::Test
  def test_base64
    text = "$$><'2    ABC  유니코드"
    b64 = "JCQ-PCcyICAgIEFCQyAg7Jyg64uI7L2U65Oc"

    b64_1 = Saro::Dat::Util.encode_base64_url_str(text)
    assert_equal b64, b64_1
    puts b64_1

    de_b64_1 = Saro::Dat::Util.decode_base64_url_str(b64_1)
    assert_equal text, de_b64_1
    puts de_b64_1

    puts "Test passed successfully"
  end
end
