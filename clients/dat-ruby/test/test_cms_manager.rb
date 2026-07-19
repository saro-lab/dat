# frozen_string_literal: true

require_relative './test_helper'

class TestExampleCms < Minitest::Test
  def test_use_dat_cms
    manager = Saro::Dat::DatCmsManager.builder
      .uri("http://localhost:8088")
      .verify_only(false)
      #.interval_off # disable auto sync
      .interval_seconds(1)
      .token("12345678901b")
      .build

    # manual sync
    manager.sync

    begin
      plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिको드 Ю니код 🦄💻"
      secure = "Ciphertext 암호문 暗号文 密文 Шифро텍스트 Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

      puts "plain : " + plain
      puts "secure : " + secure

      # issue dat
      dat = manager.issue(plain, secure)
      puts "dat : " + dat

      # parse dat
      payload = manager.parse(dat)

      payload_plain = payload.plain
      payload_secure = payload.secure

      puts "payload plain : " + payload_plain
      puts "payload secure : " + payload_secure

      assert_equal plain, payload_plain
      assert_equal secure, payload_secure


    rescue => e
      puts "ignored error: #{e.message}"
    end

    sleep(5)
    manager.stop
  end
end
