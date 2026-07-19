# frozen_string_literal: true

require_relative './test_helper'
require 'benchmark'
require 'parallel'
require 'etc'

class TestBench < Minitest::Test
  def generate_base62(length)
    characters = ('a'..'z').to_a + ('A'..'Z').to_a + ('0'..'9').to_a
    Array.new(length) { characters.sample }.join
  end

  def loops(multi_thread, loop_size, certificates, plain, secure)
    mode_name = multi_thread ? "Multi-Thread" : "Single-Thread"
    puts "\n--- #{mode_name} ---"

    processors_count = Etc.nprocessors

    certificates.each do |cert|
      pre = "#{cert.signature_key.algorithm} #{cert.crypto_key.algorithm}"

      start_time = Time.now
      last_dat = ""

      if multi_thread
        results = Parallel.map(1..loop_size, in_processes: processors_count) do |_i|
          Saro::Dat::DatManager._issue(cert, plain, secure)
        end
        last_dat = results.last
      else
        loop_size.times do
          last_dat = Saro::Dat::DatManager._issue(cert, plain, secure)
        end
      end

      duration_ms = (Time.now - start_time) * 1000
      puts "#{pre} Issue * #{loop_size} : #{duration_ms.to_i}ms"


      # 2. Parse Benchmark
      start_time = Time.now
      last_payload = nil

      if multi_thread
        results = Parallel.map(1..loop_size, in_processes: processors_count) do |_i|
          Saro::Dat::DatManager._parse(cert, last_dat)
        end
        last_payload = results.last
      else
        loop_size.times do
          last_payload = Saro::Dat::DatManager._parse(cert, last_dat)
        end
      end

      duration_ms = (Time.now - start_time) * 1000
      puts "#{pre} Parse * #{loop_size} : #{duration_ms.to_i}ms"

      # 검증
      assert_equal plain, last_payload.plain
      assert_equal secure, last_payload.secure
    end
  end

  def test_bench
    loop_size = 10000
    plain = generate_base62(100)
    secure = generate_base62(100)

    puts "Performance Test (Plain, Secure)"
    puts "Plain: #{plain}"
    puts "Secure: #{secure}"

    certificates = []
    now = Time.now.to_i

    [
      Saro::Dat::DatSignatureAlgorithm::HMAC_SHA256_MFS,
      Saro::Dat::DatSignatureAlgorithm::HMAC_SHA384_MFS,
      Saro::Dat::DatSignatureAlgorithm::HMAC_SHA512_MFS,
      Saro::Dat::DatSignatureAlgorithm::ECDSA_P256,
      Saro::Dat::DatSignatureAlgorithm::ECDSA_P384,
      Saro::Dat::DatSignatureAlgorithm::ECDSA_P521
    ].each do |sa|
      Saro::Dat::DatCryptoAlgorithm.all.each do |ca|
        begin
          certificates << Saro::Dat::DatCertificate.new(
            0,
            now - 10,
            610,
            60,
            Saro::Dat::DatSignature.generate(sa),
            Saro::Dat::DatCrypto.generate(ca)
          )
        rescue OpenSSL::Cipher::CipherError
        end
      end
    end

    loops(true, loop_size, certificates, plain, secure)
    loops(false, loop_size, certificates, plain, secure)
  end
end
