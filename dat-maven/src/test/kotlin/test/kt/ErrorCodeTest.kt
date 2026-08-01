package test.kt

import me.saro.dat.Unixtime
import me.saro.dat.crypto.DatCrypto
import me.saro.dat.crypto.DatCryptoAlgorithm
import me.saro.dat.dat.Dat
import me.saro.dat.dat.DatCertificate
import me.saro.dat.dat.DatManager
import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException
import me.saro.dat.exception.DatRetry
import me.saro.dat.signature.DatSignature
import me.saro.dat.signature.DatSignatureAlgorithm
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

/**
 * 오류 코드 회귀 안전망 (error.pre2.md).
 *
 * 단언하는 것은 "실패했다"가 아니라 **어느 코드로 실패했다** 이다 — 재매핑 사고는
 * 전자로는 절대 안 잡힌다. 이 체계를 만든 세 가지 이유를 고정한다:
 *
 *  1. 만료 / 형식 오류 / 서명 위조가 갈리는가
 *  2. 서명 불일치 / 백엔드 실패가 갈리는가
 *  3. "발급할 인증서 없음"의 다섯 가지 사유가 갈리는가
 */
class ErrorCodeTest {
    private val sigAlg = DatSignatureAlgorithm.ECDSA_P256
    private val cryAlg = DatCryptoAlgorithm.IV_AES256_GCM

    private fun cert(cid: Long = 1L, startOffset: Long = -10L, duration: Long = 200L, ttl: Long = 100L) =
        DatCertificate.generate(cid, Unixtime.now() + startOffset, duration, ttl, sigAlg, cryAlg)

    private fun manager(vararg certificates: DatCertificate): DatManager =
        DatManager.newInstance().apply { imports(certificates.toList(), true) }

    /** 던져진 예외가 DatException 인지 확인하고 코드를 돌려준다. */
    private fun codeOfThrown(block: () -> Unit): String {
        val e = assertThrows(DatException::class.java, block)
        return e.code
    }

    /** DatResult 실패의 코드를 돌려준다. */
    private fun codeOfResult(result: me.saro.dat.exception.DatResult<*>): String {
        assertTrue(result.isFailure, "expected a failure, got success")
        val e = result.exceptionOrNull()
        assertInstanceOf(DatException::class.java, e, "failure must be a DatException, got $e")
        return (e as DatException).code
    }

    private fun errorOfResult(result: me.saro.dat.exception.DatResult<*>): DatException {
        assertTrue(result.isFailure, "expected a failure, got success")
        return result.exceptionOrNull() as DatException
    }

    // ---- 1. 만료 / 형식 오류 / 서명 위조 ----

    @Test
    fun expiredTokenIsNotMalformed() {
        val c = cert()
        val token = DatManager.issue(c, "p", "s").getOrThrow()
        val rest = token.substringAfter('.')

        assertEquals(DatErrorCode.TOKEN_EXPIRED.code, codeOfResult(Dat.parse("${Unixtime.now() - 1}.$rest")))
        // 정각도 만료다 (rust dat.rs: expire > now 여야 유효).
        assertEquals(DatErrorCode.TOKEN_EXPIRED.code, codeOfResult(Dat.parse("${Unixtime.now()}.$rest")))
    }

    @Test
    fun malformedTokenShapes() {
        val c = cert()
        val token = DatManager.issue(c, "p", "s").getOrThrow()
        val parts = token.split('.')

        // 파트 수 부족 / 초과
        assertEquals(DatErrorCode.TOKEN_MALFORMED.code, codeOfResult(Dat.parse("1.2.3")))
        assertEquals(DatErrorCode.TOKEN_MALFORMED.code, codeOfResult(Dat.parse("$token.extra")))
        // expire 가 10진수가 아님 — 만료가 아니라 형식 오류다
        assertEquals(DatErrorCode.TOKEN_MALFORMED.code, codeOfResult(Dat.parse("+$token")))
        // cid 가 16진수가 아님
        assertEquals(
            DatErrorCode.TOKEN_MALFORMED.code,
            codeOfResult(Dat.parse("${parts[0]}.zz.${parts.drop(2).joinToString(".")}"))
        )
    }

    @Test
    fun emptySignatureIsSigMalformedNotMismatch() {
        val c = cert()
        val token = DatManager.issue(c, "p", "s").getOrThrow()
        val body = token.substring(0, token.lastIndexOf('.'))

        assertEquals(DatErrorCode.SIG_MALFORMED.code, codeOfResult(Dat.parse("$body.")))
    }

    @Test
    fun forgedSignatureIsSigMismatch() {
        // 같은 cid 를 다른 키로 발급하면 서명만 안 맞는다.
        val victim = cert(cid = 7L)
        val attacker = cert(cid = 7L)
        val forged = DatManager.issue(attacker, "p", "s").getOrThrow()

        val e = errorOfResult(DatManager.parse(victim, forged))
        assertEquals(DatErrorCode.SIG_MISMATCH.code, e.code)
        assertTrue(e.securityEvent, "위조는 보안 이벤트로 표시되어야 한다")
        assertEquals(DatRetry.PERMANENT, e.retry)
    }

    @Test
    fun tamperedSecureIsCryptoTagMismatch() {
        // 서명 검증을 건너뛰는 경로에서는 GCM 태그가 유일한 무결성 검사다.
        val c = cert()
        val token = DatManager.issue(c, "plain", "secure-payload").getOrThrow()
        val parts = token.split('.').toMutableList()

        val secure = parts[3]
        val last = secure.last()
        parts[3] = secure.dropLast(1) + (if (last == 'A') 'B' else 'A')

        val e = errorOfResult(DatManager.parseWithoutVerifying(c, parts.joinToString(".")))
        assertEquals(DatErrorCode.CRYPTO_TAG_MISMATCH.code, e.code)
        assertTrue(e.securityEvent, "변조는 보안 이벤트로 표시되어야 한다")
    }

    // ---- 2. 인증서 ----

    @Test
    fun unknownCidIsCertNotFound() {
        val mgr = manager(cert(cid = 1L))
        val token = DatManager.issue(cert(cid = 999L), "p", "s").getOrThrow()

        assertEquals(DatErrorCode.CERT_NOT_FOUND.code, codeOfResult(mgr.parse(token)))
    }

    @Test
    fun cidInNotFoundMessageIsHex() {
        // cid 는 16진으로 통일한다. 예전에는 10진으로 찍혀 다른 포트의 로그와
        // 대조가 되지 않았다.
        val mgr = manager(cert(cid = 1L))
        val token = DatManager.issue(cert(cid = 255L), "p", "s").getOrThrow()
        val e = errorOfResult(mgr.parse(token))

        assertEquals(DatErrorCode.CERT_NOT_FOUND.code, e.code)
        assertTrue(e.detail!!.contains("ff"), "cid must be printed in hex, got: ${e.detail}")
    }

    @Test
    fun duplicateCidOnImport() {
        assertEquals(
            DatErrorCode.CERT_DUPLICATE_CID.code,
            codeOfThrown { DatManager.newInstance().imports(listOf(cert(cid = 5L), cert(cid = 5L)), true) }
        )
    }

    @Test
    fun malformedCertificateShapes() {
        // 파트 수 부족
        assertEquals(DatErrorCode.CERT_MALFORMED.code, codeOfThrown { DatCertificate.parse("a.b.c") })
        // 8 파트지만 cid 가 16진수가 아님
        assertEquals(
            DatErrorCode.CERT_MALFORMED.code,
            codeOfThrown { DatCertificate.parse("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA") }
        )
        // 시간 산술 오버플로 — snake_case/camelCase 로 갈려 있던 2종이 같은 코드로 모인다
        val sig = DatSignature.generate(sigAlg)
        val cry = DatCrypto.generate(cryAlg)
        assertEquals(
            DatErrorCode.CERT_MALFORMED.code,
            codeOfThrown { DatCertificate.new(1UL, ULong.MAX_VALUE, 1UL, 0UL, sig.clone(), cry.clone()) }
        )
        assertEquals(
            DatErrorCode.CERT_MALFORMED.code,
            codeOfThrown { DatCertificate.new(1UL, ULong.MAX_VALUE - 1UL, 1UL, 1UL, sig.clone(), cry.clone()) }
        )
    }

    @Test
    fun certificateFieldCausesAreNotFlattened() {
        // 예전에는 알고리즘 이름 오류가 "Invalid Dat Certificate Format" 으로 덮였다.
        // 이제 각자의 코드가 그대로 올라온다.
        assertEquals(
            DatErrorCode.CONFIG_ALG_UNSUPPORTED.code,
            codeOfThrown { DatCertificate.parse("ff.1.2.3.NOPE.IV-AES256-GCM.AAAA.AAAA") }
        )
        assertEquals(
            DatErrorCode.CONFIG_ALG_UNSUPPORTED.code,
            codeOfThrown { DatCertificate.parse("ff.1.2.3.ECDSA-P256.NOPE.AAAA.AAAA") }
        )
        // 키 재료가 짧으면 KEY_INVALID
        assertEquals(
            DatErrorCode.KEY_INVALID.code,
            codeOfThrown { DatCertificate.parse("ff.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA") }
        )
    }

    // ---- 3. "발급할 인증서 없음" 다섯 갈래 ----

    @Test
    fun noCertificateAtAll() {
        val e = errorOfResult(DatManager.newInstance().issue("p", "s"))
        assertEquals(DatErrorCode.MANAGER_NO_CERTIFICATE.code, e.code)
        // CMS 접속 문제일 수 있으므로 기다려 볼 값어치가 있다.
        assertEquals(DatRetry.TRANSIENT, e.retry)
    }

    @Test
    fun issuanceWindowNotYetOpenIsTransient() {
        val mgr = manager(cert(startOffset = 3600L))

        val e = errorOfResult(mgr.issue("p", "s"))
        assertEquals(DatErrorCode.MANAGER_NO_ISSUABLE_CERTIFICATE.code, e.code)
        assertEquals(DatErrorCode.CERT_NOT_YET_ISSUABLE.code, (e.cause as DatException).code)
        // 기다리면 풀리는 유일한 사유다.
        assertEquals(DatRetry.TRANSIENT, e.retry)
    }

    @Test
    fun issuanceWindowClosedIsPermanent() {
        // 발급창은 닫혔지만 ttl 이 남아 검증은 된다.
        val mgr = manager(cert(startOffset = -500L, duration = 100L, ttl = 3600L))

        val e = errorOfResult(mgr.issue("p", "s"))
        assertEquals(DatErrorCode.MANAGER_NO_ISSUABLE_CERTIFICATE.code, e.code)
        assertEquals(DatErrorCode.CERT_ISSUANCE_ENDED.code, (e.cause as DatException).code)
        assertEquals(DatRetry.PERMANENT, e.retry)
    }

    @Test
    fun verifyOnlyCertificateCannotIssue() {
        val source = cert()
        val verifyOnly = DatCertificate.parse(source.exports(true))
        val mgr = manager(verifyOnly)

        val e = errorOfResult(mgr.issue("p", "s"))
        assertEquals(DatErrorCode.MANAGER_NO_ISSUABLE_CERTIFICATE.code, e.code)
        // 배포 설정 실수다 — 기다려도 안 풀린다.
        assertEquals(DatErrorCode.CERT_VERIFY_ONLY.code, (e.cause as DatException).code)
        assertEquals(DatRetry.PERMANENT, e.retry)
    }

    // ---- 키 · 알고리즘 ----

    @Test
    fun unknownAlgorithmNames() {
        assertEquals(
            DatErrorCode.CONFIG_ALG_UNSUPPORTED.code,
            codeOfThrown { DatSignatureAlgorithm.fromString("NOPE") }
        )
        assertEquals(
            DatErrorCode.CONFIG_ALG_UNSUPPORTED.code,
            codeOfThrown { DatCryptoAlgorithm.fromString("NOPE") }
        )
    }

    @Test
    fun wrongKeySizeIsKeyInvalidNotSigMismatch() {
        // 예전에는 이 키 크기 오류와 검증 실패가 둘 다 "Invalid Dat Signature" 였다.
        assertEquals(
            DatErrorCode.KEY_INVALID.code,
            codeOfThrown { DatSignature.fromKey(DatSignatureAlgorithm.HMAC_SHA256_MFS, ByteArray(7)) }
        )
        assertEquals(
            DatErrorCode.KEY_INVALID.code,
            codeOfThrown { DatSignature.fromKey(sigAlg, ByteArray(7)) }
        )
        assertEquals(
            DatErrorCode.KEY_INVALID.code,
            codeOfThrown { DatCrypto.fromBytes(cryAlg, ByteArray(7)) }
        )
    }

    @Test
    fun hmacVerifyOnlyExportIsStructurallyUnsupported() {
        // 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
        val hmac = DatSignature.generate(DatSignatureAlgorithm.HMAC_SHA256_MFS)
        assertEquals(
            DatErrorCode.KEY_VERIFY_ONLY_UNSUPPORTED.code,
            codeOfThrown { hmac.exportKey(true) }
        )
    }

    @Test
    fun signingWithVerifyOnlyKeyIsKeyMissing() {
        val source = DatSignature.generate(sigAlg)
        val publicOnly = DatSignature.fromKey(sigAlg, source.exportKey(true))
        assertEquals(
            DatErrorCode.SIG_KEY_MISSING.code,
            codeOfThrown { publicOnly.sign("body".toByteArray()) }
        )
    }

    @Test
    fun ciphertextShorterThanIv() {
        val crypto = DatCrypto.generate(cryAlg)
        assertEquals(
            DatErrorCode.CRYPTO_DATA_INVALID.code,
            codeOfThrown { crypto.decrypt(ByteArray(5)) }
        )
    }

    @Test
    fun emptySecurePayloadIsNotAnError() {
        // 빈 입력 → 빈 출력. 모든 공식 클라이언트 공통이며 어떤 코드도 내지 않는다.
        val crypto = DatCrypto.generate(cryAlg)
        assertEquals(0, crypto.encrypt(ByteArray(0)).size)
        assertEquals(0, crypto.decrypt(ByteArray(0)).size)
    }

    // ---- 코드 체계 자체의 불변식 ----

    @Test
    fun everyCodeIsWellFormed() {
        for (c in DatErrorCode.entries) {
            assertTrue(c.code.startsWith("DAT_"), "${c.code} must start with DAT_")
            assertTrue(
                c.code.all { it in 'A'..'Z' || it == '_' },
                "${c.code} must be SCREAMING_SNAKE_CASE"
            )
        }
        // 코드가 메시지의 머리에 온다.
        assertEquals("DAT_TOKEN_EXPIRED", DatException(DatErrorCode.TOKEN_EXPIRED).message)
        assertEquals(
            "DAT_TOKEN_MALFORMED: bad field",
            DatException(DatErrorCode.TOKEN_MALFORMED, "bad field").message
        )
    }

    @Test
    fun causeChainIsPreserved() {
        // maven 의 선결 과제였다 — 예전 DatException 에는 cause 생성자가 없었다.
        val root = DatException(DatErrorCode.CERT_MALFORMED, "bad field")
        val wrapped = DatException(DatErrorCode.CMS_IMPORT_FAILED, null, root)

        assertEquals(DatErrorCode.CMS_IMPORT_FAILED.code, wrapped.code)
        assertSame(root, wrapped.cause)
        assertEquals(DatErrorCode.CERT_MALFORMED.code, DatException.codeOf(wrapped.cause))
    }

    @Test
    fun retryClassification() {
        // 401 에 60초마다 영원히 재시도하던 것이 이 분류의 존재 이유다.
        for (c in listOf(DatErrorCode.CMS_UNAUTHORIZED, DatErrorCode.CMS_FORBIDDEN, DatErrorCode.CMS_ENDPOINT_NOT_FOUND)) {
            assertEquals(DatRetry.PERMANENT, DatException(c).retry, c.code)
        }
        for (c in listOf(DatErrorCode.CMS_UNREACHABLE, DatErrorCode.CMS_SERVER_ERROR, DatErrorCode.CMS_NOT_SYNCED)) {
            assertEquals(DatRetry.TRANSIENT, DatException(c).retry, c.code)
        }
        for (c in listOf(DatErrorCode.CMS_SYNC_IN_PROGRESS, DatErrorCode.CMS_VERSION_RESET)) {
            assertEquals(DatRetry.STATE, DatException(c).retry, c.code)
        }
    }

    @Test
    fun httpStatusIsSplit() {
        assertEquals(DatErrorCode.CMS_UNAUTHORIZED.code, me.saro.dat.dat.DatCmsManager.httpStatusError(401).code)
        assertEquals(DatErrorCode.CMS_FORBIDDEN.code, me.saro.dat.dat.DatCmsManager.httpStatusError(403).code)
        assertEquals(DatErrorCode.CMS_ENDPOINT_NOT_FOUND.code, me.saro.dat.dat.DatCmsManager.httpStatusError(404).code)
        assertEquals(DatErrorCode.CMS_SERVER_ERROR.code, me.saro.dat.dat.DatCmsManager.httpStatusError(503).code)
        assertEquals(DatErrorCode.CMS_HTTP_STATUS.code, me.saro.dat.dat.DatCmsManager.httpStatusError(418).code)
    }
}
