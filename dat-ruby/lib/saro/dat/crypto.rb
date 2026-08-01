# frozen_string_literal: true

require 'openssl'
require 'securerandom'
require_relative 'error'
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
      raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CONFIG_ALG_UNSUPPORTED, "unknown crypto algorithm: #{algorithm}")
    end

    class DatCrypto
      attr_reader :algorithm

      def initialize(algorithm, key_bytes, config = nil)
        @config = config || Saro::Dat.get_crypto_config(algorithm)
        # OpenSSL accepts any valid AES length, so a 16-byte key would silently
        # become AES-128 under an IV-AES256-GCM label without this check.
        if key_bytes.bytesize != @config[:length]
          raise Saro::Dat::Error.new(
            Saro::Dat::ErrorCode::KEY_INVALID,
            "#{algorithm} key must be #{@config[:length]} bytes, got #{key_bytes.bytesize}"
          )
        end
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
        
        begin
          ciphertext = cipher.update(data) + cipher.final
          tag = cipher.auth_tag
        rescue OpenSSL::Cipher::CipherError => e
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CRYPTO_BACKEND, "aes-gcm encrypt failed", cause: e)
        end

        nonce + ciphertext + tag
      end

      # Decrypts base64url-encoded ciphertext.
      def decrypt_base64(base64_str)
        decrypt(Saro::Dat::Util.decode_base64_url(base64_str))
      end

      # Decrypts raw (already decoded) ciphertext: nonce(12) + ciphertext + tag(16).
      # Use #decrypt_base64 for encoded input. The branch used to be picked from
      # the string's encoding tag, so raw ciphertext that merely carried a UTF-8
      # tag was silently mangled by the base64 decoder.
      def decrypt(data)
        return "".b if data.nil? || data.empty?

        # Slice by bytes, never by characters: String#[] is character-indexed on
        # a non-binary string, so raw ciphertext carrying a UTF-8 tag would be
        # split at the wrong offsets.
        data = data.b if data.is_a?(String) && data.encoding != Encoding::BINARY

        if data.bytesize <= 12 + 16 # nonce(12) + tag(16)
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CRYPTO_DATA_INVALID, "ciphertext is shorter than iv(12) + tag(16)")
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

        # cipher.final 에서 나는 실패는 GCM 인증 태그 불일치다 — 변조된 secure 이거나
        # 잘못된 인증서 키다. 예전에는 OpenSSL::Cipher::CipherError 가 그대로 공개
        # API 밖으로 새어 나갔다. 서명 검증을 건너뛰는 경로에서는 이것이 유일한
        # 무결성 검사이므로 백엔드 오류(CRYPTO_BACKEND)와 반드시 구분한다.
        begin
          res = cipher.update(ciphertext) + cipher.final
        rescue OpenSSL::Cipher::CipherError => e
          raise Saro::Dat::Error.new(Saro::Dat::ErrorCode::CRYPTO_TAG_MISMATCH, "gcm authentication tag mismatch", cause: e)
        end
        res.force_encoding('BINARY')
        res
      end
    end
  end
end
