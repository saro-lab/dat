# frozen_string_literal: true

require_relative 'test_helper'

class TestErrorCode < Minitest::Test
  EC = Saro::Dat::ErrorCode
  SIG = Saro::Dat::DatSignatureAlgorithm::ECDSA_P256
  CRY = Saro::Dat::DatCryptoAlgorithm::IV_AES256_GCM

  def certificate(cid, start_offset, duration, ttl)
    Saro::Dat::DatCertificate.generate(cid, Time.now.to_i + start_offset, duration, ttl, SIG, CRY)
  end

  def issuable_manager(cid = 1)
    m = Saro::Dat::DatManager.new
    m.import_certificates([certificate(cid, -10, 200, 100)])
    m
  end

  def code_of
    yield
    flunk "expected an error, got success"
  rescue Saro::Dat::Error => e
    e.code
  end

  def error_of
    yield
    flunk "expected an error, got success"
  rescue Saro::Dat::Error => e
    e
  end

  def with_expire(token, expire)
    "#{expire}.#{token.split('.', 2)[1]}"
  end

  def test_expired_token_is_not_malformed
    m = issuable_manager
    token = m.issue('p', 's')
    now = Time.now.to_i

    assert_equal EC::TOKEN_EXPIRED, code_of { m.parse(with_expire(token, now - 1)) }
    assert_equal EC::TOKEN_EXPIRED, code_of { m.parse(with_expire(token, now)) }
  end

  def test_malformed_token_shapes
    m = issuable_manager
    token = m.issue('p', 's')
    parts = token.split('.', -1)

    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse('1.2.3') }
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse("#{token}.extra") }
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse("#{token}.") }
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse("+#{token}") }
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse([parts[0], 'zz', *parts[2..]].join('.')) }
  end

  def test_empty_signature_is_sig_malformed
    m = issuable_manager
    parts = m.issue('p', 's').split('.', -1)

    assert_equal EC::SIG_MALFORMED, code_of { m.parse("#{parts[0, 4].join('.')}.") }
  end

  def test_forged_signature_is_sig_mismatch
    victim = issuable_manager(7)
    attacker = issuable_manager(7)
    forged = attacker.issue('p', 's')

    e = error_of { victim.parse(forged) }
    assert_equal EC::SIG_MISMATCH, e.code
    assert e.security_event?, '위조는 보안 이벤트로 표시되어야 한다'
    assert_equal :permanent, e.retry
  end

  def test_tampered_secure_is_crypto_tag_mismatch
    cert = certificate(1, -10, 200, 100)
    token = Saro::Dat::DatManager._issue(cert, 'plain', 'secure-payload')
    parts = token.split('.', -1)

    last = parts[3][-1]
    parts[3] = parts[3][0..-2] + (last == 'A' ? 'B' : 'A')

    dat = Saro::Dat::Dat.new(parts.join('.'))
    e = error_of { cert.crypto_key.decrypt(dat.secure) }
    assert_equal EC::CRYPTO_TAG_MISMATCH, e.code
    assert e.security_event?
  end

  def test_unknown_cid_is_cert_not_found
    m = issuable_manager(1)
    other = issuable_manager(999)

    assert_equal EC::CERT_NOT_FOUND, code_of { m.parse(other.issue('p', 's')) }
  end

  def test_duplicate_cid_on_import
    a = certificate(5, -10, 200, 100)
    b = certificate(5, -10, 200, 100)

    assert_equal EC::CERT_DUPLICATE_CID, code_of { Saro::Dat::DatManager.new.import_certificates([a, b]) }
  end

  def test_malformed_certificate_shapes
    assert_equal EC::CERT_MALFORMED, code_of { Saro::Dat::DatCertificate.imports('a.b.c') }
    assert_equal EC::CERT_MALFORMED,
                 code_of { Saro::Dat::DatCertificate.imports('zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA') }
    assert_equal EC::CERT_MALFORMED,
                 code_of { certificate_with_times(1, 0xFFFFFFFFFFFFFFFF, 1, 0) }
  end

  def certificate_with_times(cid, start, duration, ttl)
    Saro::Dat::DatCertificate.new(
      cid, start, duration, ttl,
      Saro::Dat::DatSignature.generate(SIG),
      Saro::Dat::DatCrypto.generate(CRY)
    )
  end

  def test_no_certificate_at_all
    e = error_of { Saro::Dat::DatManager.new.issue('p', 's') }
    assert_equal EC::MANAGER_NO_CERTIFICATE, e.code
    assert_equal :transient, e.retry
  end

  def test_issuance_window_not_yet_open_is_transient
    m = Saro::Dat::DatManager.new
    m.import_certificates([certificate(1, 3600, 200, 100)])

    e = error_of { m.issue('p', 's') }
    assert_equal EC::MANAGER_NO_ISSUABLE_CERTIFICATE, e.code
    assert_equal EC::CERT_NOT_YET_ISSUABLE, e.cause.code
    assert_equal :transient, e.retry
  end

  def test_issuance_window_closed_is_permanent
    m = Saro::Dat::DatManager.new
    m.import_certificates([certificate(1, -500, 100, 3600)])

    e = error_of { m.issue('p', 's') }
    assert_equal EC::MANAGER_NO_ISSUABLE_CERTIFICATE, e.code
    assert_equal EC::CERT_ISSUANCE_ENDED, e.cause.code
    assert_equal :permanent, e.retry
  end

  def test_verify_only_certificate_cannot_issue
    source = certificate(1, -10, 200, 100)
    verify_only = Saro::Dat::DatCertificate.imports(source.exports(true))
    m = Saro::Dat::DatManager.new
    m.import_certificates([verify_only])

    e = error_of { m.issue('p', 's') }
    assert_equal EC::MANAGER_NO_ISSUABLE_CERTIFICATE, e.code
    assert_equal EC::CERT_VERIFY_ONLY, e.cause.code
    assert_equal :permanent, e.retry
  end

  def test_unknown_algorithm_names
    assert_equal EC::CONFIG_ALG_UNSUPPORTED, code_of { Saro::Dat::DatSignature.generate('NOPE') }
    assert_equal EC::CONFIG_ALG_UNSUPPORTED, code_of { Saro::Dat::DatCrypto.generate('NOPE') }
  end

  def test_wrong_key_size_is_key_invalid
    assert_equal EC::KEY_INVALID, code_of { Saro::Dat::DatCrypto.imports(CRY, 'AAAA') }
    assert_equal EC::KEY_INVALID,
                 code_of { Saro::Dat::DatSignature.imports(Saro::Dat::DatSignatureAlgorithm::HMAC_SHA256_MFS, 'AAAA') }
    assert_equal EC::KEY_INVALID, code_of { Saro::Dat::DatSignature.imports(SIG, 'AAAA') }
  end

  def test_hmac_verify_only_export_is_structurally_unsupported
    hmac = Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::HMAC_SHA256_MFS)
    assert_equal EC::KEY_VERIFY_ONLY_UNSUPPORTED, code_of { hmac.exports(true) }
  end

  def test_signing_with_verify_only_key_is_key_missing
    source = Saro::Dat::DatSignature.generate(SIG)
    public_only = Saro::Dat::DatSignature.imports(SIG, source.exports(true))

    assert_equal EC::SIG_KEY_MISSING, code_of { public_only.sign('body') }
  end

  def test_ciphertext_shorter_than_iv_and_tag
    crypto = Saro::Dat::DatCrypto.generate(CRY)
    assert_equal EC::CRYPTO_DATA_INVALID, code_of { crypto.decrypt('12345'.b) }
  end

  def test_empty_secure_payload_is_not_an_error
    crypto = Saro::Dat::DatCrypto.generate(CRY)
    assert_equal '', crypto.encrypt('')
    assert_equal '', crypto.decrypt('')
  end

  def test_every_code_is_well_formed
    codes = EC.constants.map { |c| EC.const_get(c) }.grep(String)
    refute_empty codes
    codes.each do |code|
      assert_match(/\A DAT_[A-Z_]+ \z/x, code, "#{code} must be DAT_ SCREAMING_SNAKE_CASE")
    end
  end

  def test_code_comes_first_in_the_message
    assert_equal 'DAT_TOKEN_EXPIRED', Saro::Dat::Error.new(EC::TOKEN_EXPIRED).message
    assert_equal 'DAT_TOKEN_MALFORMED: bad field',
                 Saro::Dat::Error.new(EC::TOKEN_MALFORMED, 'bad field').message
  end

  def test_retry_classification
    [EC::CMS_UNAUTHORIZED, EC::CMS_FORBIDDEN, EC::CMS_ENDPOINT_NOT_FOUND].each do |code|
      assert_equal :permanent, Saro::Dat::Error.new(code).retry, code
    end
    [EC::CMS_UNREACHABLE, EC::CMS_SERVER_ERROR, EC::CMS_NOT_SYNCED].each do |code|
      assert_equal :transient, Saro::Dat::Error.new(code).retry, code
    end
    [EC::CMS_SYNC_IN_PROGRESS, EC::CMS_VERSION_RESET].each do |code|
      assert_equal :state, Saro::Dat::Error.new(code).retry, code
    end
  end

  def test_http_status_maps_to_distinct_codes
    m = Saro::Dat::DatCmsManager
    assert_equal EC::CMS_UNAUTHORIZED, m.http_status_error(401).code
    assert_equal EC::CMS_FORBIDDEN, m.http_status_error(403).code
    assert_equal EC::CMS_ENDPOINT_NOT_FOUND, m.http_status_error(404).code
    assert_equal EC::CMS_SERVER_ERROR, m.http_status_error(503).code
    assert_equal EC::CMS_HTTP_STATUS, m.http_status_error(418).code
  end

  def test_cause_chain_is_preserved
    inner = Saro::Dat::Error.new(EC::CERT_MALFORMED, 'bad field')
    outer = Saro::Dat::Error.new(EC::CMS_IMPORT_FAILED, cause: inner)

    assert_equal EC::CMS_IMPORT_FAILED, outer.code
    assert_equal EC::CERT_MALFORMED, outer.cause.code
  end

  def test_uri_validation_uses_config_uri_invalid
    b = Saro::Dat::DatCmsManager.builder
    assert_equal EC::CONFIG_URI_INVALID, code_of { b.uri('http://localhost:8088/abc').build }
    assert_equal EC::CONFIG_URI_INVALID, code_of { Saro::Dat::DatCmsManager.builder.uri('ftp://localhost').build }
  end
end
