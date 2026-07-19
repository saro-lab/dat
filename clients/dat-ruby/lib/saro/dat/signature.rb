# frozen_string_literal: true

require 'openssl'
require_relative 'util'

module Saro
  module Dat
    class DatSignatureAlgorithm
      HMAC_SHA256_MFS = "HMAC-SHA256-MFS"
      HMAC_SHA384_MFS = "HMAC-SHA384-MFS"
      HMAC_SHA512_MFS = "HMAC-SHA512-MFS"
      ECDSA_P256 = "ECDSA-P256"
      ECDSA_P384 = "ECDSA-P384"
      ECDSA_P521 = "ECDSA-P521"

      def self.all
        [HMAC_SHA256_MFS, HMAC_SHA384_MFS, HMAC_SHA512_MFS, ECDSA_P256, ECDSA_P384, ECDSA_P521]
      end
    end

    SIGNATURE_CONFIG = {
      "HMAC-SHA256-MFS" => { name: "HMAC", hash: "SHA256", hmac_len: 32 },
      "HMAC-SHA384-MFS" => { name: "HMAC", hash: "SHA384", hmac_len: 48 },
      "HMAC-SHA512-MFS" => { name: "HMAC", hash: "SHA512", hmac_len: 64 },
      "ECDSA-P256" => { name: "ECDSA", curve: "prime256v1", hash: "SHA256", private_len: 32, public_len: 65 },
      "ECDSA-P384" => { name: "ECDSA", curve: "secp384r1", hash: "SHA384", private_len: 48, public_len: 97 },
      "ECDSA-P521" => { name: "ECDSA", curve: "secp521r1", hash: "SHA512", private_len: 66, public_len: 133 }
    }.freeze

    def self.get_signature_config(algorithm)
      config = SIGNATURE_CONFIG[algorithm]
      return config if config
      raise ArgumentError, "Unsupported DAT Crypto Algorithm: #{algorithm}"
    end

    class DatSignature
      attr_reader :algorithm, :signing_key, :verifying_key

      def initialize(algorithm, signing_key, verifying_key, config = nil)
        @algorithm = algorithm
        @signing_key = signing_key
        @verifying_key = verifying_key
        @config = config || Saro::Dat.get_signature_config(algorithm)
      end

      private_class_method def self.create_ec_key(curve_name, priv_bn = nil, pub_octet = nil)
        if priv_bn
          group = OpenSSL::PKey::EC::Group.new(curve_name)
          pub_octet ||= group.generator.mul(priv_bn).to_octet_string(:uncompressed)
          
          asn1 = OpenSSL::ASN1::Sequence.new([
            OpenSSL::ASN1::Integer.new(1),
            OpenSSL::ASN1::OctetString.new(priv_bn.to_s(2).rjust((group.degree + 7) / 8, "\x00".b)),
            OpenSSL::ASN1::ASN1Data.new([OpenSSL::ASN1::ObjectId.new(curve_name)], 0, :CONTEXT_SPECIFIC),
            OpenSSL::ASN1::ASN1Data.new([OpenSSL::ASN1::BitString.new(pub_octet)], 1, :CONTEXT_SPECIFIC)
          ])
          OpenSSL::PKey::EC.new(asn1.to_der)
        elsif pub_octet
          spki = OpenSSL::ASN1::Sequence.new([
            OpenSSL::ASN1::Sequence.new([
              OpenSSL::ASN1::ObjectId.new("id-ecPublicKey"),
              OpenSSL::ASN1::ObjectId.new(curve_name)
            ]),
            OpenSSL::ASN1::BitString.new(pub_octet)
          ])
          OpenSSL::PKey::EC.new(spki.to_der)
        else
          raise ArgumentError, "Either private key or public key must be provided"
        end
      end

      def self.generate(algorithm)
        config = Saro::Dat.get_signature_config(algorithm)
        if config[:name] == "HMAC"
          key = OpenSSL::Random.random_bytes(config[:hmac_len])
          new(algorithm, key, key, config)
        else
          key = OpenSSL::PKey::EC.generate(config[:curve])
          new(algorithm, key, key, config)
        end
      end

      def self.imports(algorithm, base64_str)
        config = Saro::Dat.get_signature_config(algorithm)
        bytes_data = Saro::Dat::Util.decode_base64_url(base64_str)

        if config[:name] == "HMAC"
          if bytes_data.bytesize != config[:hmac_len]
            raise ArgumentError, "Invalid HMAC key length: expected #{config[:hmac_len]}, got #{bytes_data.bytesize}"
          end
          new(algorithm, bytes_data, bytes_data, config)
        else
          private_len = config[:private_len]
          public_len = config[:public_len]

          signing_key = nil
          verifying_key = nil

          if bytes_data.bytesize == private_len + public_len
            private_bytes = bytes_data[0, private_len]
            public_bytes = bytes_data[private_len, public_len]
            
            d_value = OpenSSL::BN.new(private_bytes, 2)
            signing_key = create_ec_key(config[:curve], d_value, public_bytes)
            verifying_key = signing_key
          elsif bytes_data.bytesize == public_len
            verifying_key = create_ec_key(config[:curve], nil, bytes_data)
          else
            raise ArgumentError, "Invalid ECDSA key length"
          end

          new(algorithm, signing_key, verifying_key, config)
        end
      end

      def exports(verify_only = false)
        if verify_only && !support_verify_only
          raise ArgumentError, "#{config[:name]} does not supported verifying only key"
        end

        if @config[:name] == "HMAC"
          Saro::Dat::Util.encode_base64_url_str(@verifying_key)
        else
          if verify_only || !@signing_key&.private_key
            public_bytes = @verifying_key.public_key.to_octet_string(:uncompressed)
            Saro::Dat::Util.encode_base64_url_str(public_bytes)
          else
            d_value = @signing_key.private_key
            curve_size = (@signing_key.group.degree + 7) / 8
            d_bytes = d_value.to_s(2).rjust(curve_size, "\x00".b)
            
            public_bytes = @verifying_key.public_key.to_octet_string(:uncompressed)
            Saro::Dat::Util.encode_base64_url_str(d_bytes + public_bytes)
          end
        end
      end

      def sign(body)
        raise ArgumentError, "Signature key is not supported - verifying only key" unless @signing_key
        body = normalize_body(body)
        raise ArgumentError, "Sign Error - body is empty" if body.nil? || body.empty?

        if @config[:name] == "HMAC"
          OpenSSL::HMAC.digest(@config[:hash], @signing_key, body)
        else
          signature_der = @signing_key.dsa_sign_asn1(OpenSSL::Digest.digest(@config[:hash], body))
          der_to_raw_signature(signature_der)
        end
      end

      def verify(body, signature)
        body = normalize_body(body)
        return false if body.nil? || body.empty?

        sig_bytes = if signature.is_a?(String) && signature.encoding != Encoding::BINARY
                      Saro::Dat::Util.decode_base64_url(signature)
                    else
                      signature
                    end

        if @config[:name] == "HMAC"
          begin
            actual_sig = OpenSSL::HMAC.digest(@config[:hash], @verifying_key, body)
            # Use fixed-time comparison if possible
            return actual_sig == sig_bytes
          rescue StandardError
            return false
          end
        else
          begin
            der_sig = raw_to_der_signature(sig_bytes)
            @verifying_key.dsa_verify_asn1(OpenSSL::Digest.digest(@config[:hash], body), der_sig)
          rescue StandardError
            false
          end
        end
      end

      def signable
        !@signing_key.nil?
      end

      def pair
        @config[:name] == "ECDSA"
      end

      def support_verify_only
        @config[:name] == "ECDSA"
      end

      private

      # Avoid a needless copy when the body is already UTF-8 encoded bytes.
      def normalize_body(body)
        return body unless body.is_a?(String)
        enc = body.encoding
        return body if enc == Encoding::BINARY || enc == Encoding::UTF_8
        body.encode('utf-8')
      end

      def der_to_raw_signature(signature_der)
        asn1 = OpenSSL::ASN1.decode(signature_der)
        r = asn1.value[0].value
        s = asn1.value[1].value

        size = @config[:private_len] # curve byte size: (group.degree + 7) / 8
        r_bytes = r.to_s(2).rjust(size, "\x00".b)
        s_bytes = s.to_s(2).rjust(size, "\x00".b)

        r_bytes + s_bytes
      end

      def raw_to_der_signature(signature_raw)
        size = signature_raw.length / 2
        r = OpenSSL::BN.new(signature_raw[0, size], 2)
        s = OpenSSL::BN.new(signature_raw[size, size], 2)
        
        r_asn1 = OpenSSL::ASN1::Integer.new(r)
        s_asn1 = OpenSSL::ASN1::Integer.new(s)
        
        OpenSSL::ASN1::Sequence.new([r_asn1, s_asn1]).to_der
      end
    end
  end
end
