# frozen_string_literal: true

require 'openssl'
require 'securerandom'
require_relative 'util'

module Saro
  module Dat
    class DatCryptoAlgorithm
      IV_AES128_GCM = "IV-AES128-GCM"
      IV_AES256_GCM = "IV-AES256-GCM"

      def self.all
        [IV_AES128_GCM, IV_AES256_GCM]
      end
    end

    CRYPTO_CONFIG = {
      "IV-AES128-GCM" => { name: "aes-128-gcm", length: 16 },
      "IV-AES256-GCM" => { name: "aes-256-gcm", length: 32 }
    }.freeze

    def self.get_crypto_config(algorithm)
      config = CRYPTO_CONFIG[algorithm]
      return config if config
      raise ArgumentError, "Unsupported DAT Crypto Algorithm: #{algorithm}"
    end

    class DatCrypto
      attr_reader :algorithm

      def initialize(algorithm, key_bytes, config = nil)
        @config = config || Saro::Dat.get_crypto_config(algorithm)
        @algorithm = algorithm
        @key_bytes = key_bytes
      end

      def self.generate(algorithm)
        config = Saro::Dat.get_crypto_config(algorithm)
        key_bytes = OpenSSL::Random.random_bytes(config[:length])
        new(algorithm, key_bytes, config)
      end

      def self.imports(algorithm, base64_str)
        key_bytes = Saro::Dat::Util.decode_base64_url(base64_str)
        new(algorithm, key_bytes)
      end

      def exports
        Saro::Dat::Util.encode_base64_url_str(@key_bytes)
      end

      def encrypt(data)
        if data.is_a?(String) && data.encoding != Encoding::BINARY && data.encoding != Encoding::UTF_8
          data = data.encode('utf-8')
        end
        return "".b if data.nil? || data.empty?

        cipher = OpenSSL::Cipher.new(@config[:name])
        cipher.encrypt
        cipher.key = @key_bytes
        nonce = OpenSSL::Random.random_bytes(12)
        cipher.iv_len = 12
        cipher.iv = nonce
        
        ciphertext = cipher.update(data) + cipher.final
        tag = cipher.auth_tag

        nonce + ciphertext + tag
      end

      def decrypt(data)
        if data.is_a?(String) && data.encoding != Encoding::BINARY
          data = Saro::Dat::Util.decode_base64_url(data)
        end
        return "".b if data.nil? || data.empty?

        if data.length <= 12 + 16 # nonce(12) + tag(16)
          raise ArgumentError, "Invalid data length"
        end

        nonce = data[0, 12]
        tag = data[-16, 16]
        ciphertext = data[12...-16]

        cipher = OpenSSL::Cipher.new(@config[:name])
        cipher.decrypt
        cipher.key = @key_bytes
        cipher.iv_len = 12
        cipher.iv = nonce
        cipher.auth_tag = tag

        res = cipher.update(ciphertext) + cipher.final
        res.force_encoding('BINARY')
        res
      end
    end
  end
end
