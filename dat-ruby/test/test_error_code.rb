# frozen_string_literal: true

require_relative 'test_helper'

# 오류 코드 회귀 안전망 (error.pre2.md).
#
# 단언하는 것은 "실패했다"가 아니라 어느 코드로 실패했다 이다 — 재매핑 사고는
# 전자로는 절대 안 잡힌다. 이 체계를 만든 세 가지 이유를 고정한다:
#
#   1. 만료 / 형식 오류 / 서명 위조가 갈리는가
#   2. 서명 불일치 / 백엔드 실패가 갈리는가
#   3. "발급할 인증서 없음"의 다섯 가지 사유가 갈리는가
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

  # 던져진 것이 Saro::Dat::Error 인지 확인하고 코드를 돌려준다.
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

  # expire 필드만 갈아 끼운다. 나머지 구조는 그대로다.
  def with_expire(token, expire)
    "#{expire}.#{token.split('.', 2)[1]}"
  end

  # ---- 1. 만료 / 형식 오류 / 서명 위조 ----

  def test_expired_token_is_not_malformed
    m = issuable_manager
    token = m.issue('p', 's')
    now = Time.now.to_i

    assert_equal EC::TOKEN_EXPIRED, code_of { m.parse(with_expire(token, now - 1)) }
    # 정각도 만료다 (interop: expire > now 여야 유효).
    assert_equal EC::TOKEN_EXPIRED, code_of { m.parse(with_expire(token, now)) }
  end

  def test_malformed_token_shapes
    m = issuable_manager
    token = m.issue('p', 's')
    parts = token.split('.', -1)

    # 파트 수 부족 / 초과
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse('1.2.3') }
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse("#{token}.extra") }
    # 뒤쪽 빈 필드를 버리던 split 때문에 예전에는 이것이 5파트로 통과했다.
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse("#{token}.") }
    # expire 가 10진수가 아님 — 만료가 아니라 형식 오류다
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse("+#{token}") }
    # cid 가 16진수가 아님
    assert_equal EC::TOKEN_MALFORMED, code_of { m.parse([parts[0], 'zz', *parts[2..]].join('.')) }
  end

  def test_empty_signature_is_sig_malformed
    m = issuable_manager
    parts = m.issue('p', 's').split('.', -1)

    assert_equal EC::SIG_MALFORMED, code_of { m.parse("#{parts[0, 4].join('.')}.") }
  end

  def test_forged_signature_is_sig_mismatch
    # 같은 cid 를 다른 키로 발급하면 서명만 안 맞는다.
    victim = issuable_manager(7)
    attacker = issuable_manager(7)
    forged = attacker.issue('p', 's')

    e = error_of { victim.parse(forged) }
    assert_equal EC::SIG_MISMATCH, e.code
    assert e.security_event?, '위조는 보안 이벤트로 표시되어야 한다'
    assert_equal :permanent, e.retry
  end

  def test_tampered_secure_is_crypto_tag_mismatch
    # 서명 검증을 건너뛰는 경로에서는 GCM 태그가 유일한 무결성 검사다.
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

  # ---- 2. 인증서 ----

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
    # 8 파트지만 cid 가 16진수가 아님
    assert_equal EC::CERT_MALFORMED,
                 code_of { Saro::Dat::DatCertificate.imports('zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA') }
    # 시간 산술이 u64 를 넘음. Ruby 정수는 bignum 이라 검사가 없으면 조용히 통과한다.
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

  # ---- 3. "발급할 인증서 없음" 다섯 갈래 ----

  def test_no_certificate_at_all
    e = error_of { Saro::Dat::DatManager.new.issue('p', 's') }
    assert_equal EC::MANAGER_NO_CERTIFICATE, e.code
    # CMS 접속 문제일 수 있으므로 기다려 볼 값어치가 있다.
    assert_equal :transient, e.retry
  end

  def test_issuance_window_not_yet_open_is_transient
    m = Saro::Dat::DatManager.new
    m.import_certificates([certificate(1, 3600, 200, 100)])

    e = error_of { m.issue('p', 's') }
    assert_equal EC::MANAGER_NO_ISSUABLE_CERTIFICATE, e.code
    assert_equal EC::CERT_NOT_YET_ISSUABLE, e.cause.code
    # 기다리면 풀리는 유일한 사유다.
    assert_equal :transient, e.retry
  end

  def test_issuance_window_closed_is_permanent
    m = Saro::Dat::DatManager.new
    # 발급창은 닫혔지만 ttl 이 남아 검증은 된다.
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
    # 배포 설정 실수다 — 기다려도 안 풀린다.
    assert_equal EC::CERT_VERIFY_ONLY, e.cause.code
    assert_equal :permanent, e.retry
  end

  # ---- 키 · 알고리즘 · 인자 ----

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
    # 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
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
    # 빈 입력 → 빈 출력. 모든 공식 클라이언트 공통이며 어떤 코드도 내지 않는다.
    crypto = Saro::Dat::DatCrypto.generate(CRY)
    assert_equal '', crypto.encrypt('')
    assert_equal '', crypto.decrypt('')
  end

  # ---- 코드 체계 자체의 불변식 ----

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
    # 401 에 60초마다 영원히 재시도하던 것이 이 분류의 존재 이유다.
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
