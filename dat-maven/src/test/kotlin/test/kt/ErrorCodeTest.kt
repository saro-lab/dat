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

class ErrorCodeTest {
    private val sigAlg = DatSignatureAlgorithm.ECDSA_P256
    private val cryAlg = DatCryptoAlgorithm.IV_AES256_GCM

    private fun cert(cid: Long = 1L, startOffset: Long = -10L, duration: Long = 200L, ttl: Long = 100L) =
        DatCertificate.generate(cid, Unixtime.now() + startOffset, duration, ttl, sigAlg, cryAlg)

    private fun manager(vararg certificates: DatCertificate): DatManager =
        DatManager.newInstance().apply { imports(certificates.toList(), true) }

    private fun codeOfThrown(block: () -> Unit): String {
        val e = assertThrows(DatException::class.java, block)
        return e.code
    }

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

    @Test
    fun expiredTokenIsNotMalformed() {
        val c = cert()
        val token = DatManager.issue(c, "p", "s").getOrThrow()
        val rest = token.substringAfter('.')

        assertEquals(DatErrorCode.TOKEN_EXPIRED.code, codeOfResult(Dat.parse("${Unixtime.now() - 1}.$rest")))
        assertEquals(DatErrorCode.TOKEN_EXPIRED.code, codeOfResult(Dat.parse("${Unixtime.now()}.$rest")))
    }

    @Test
    fun malformedTokenShapes() {
        val c = cert()
        val token = DatManager.issue(c, "p", "s").getOrThrow()
        val parts = token.split('.')

        assertEquals(DatErrorCode.TOKEN_MALFORMED.code, codeOfResult(Dat.parse("1.2.3")))
        assertEquals(DatErrorCode.TOKEN_MALFORMED.code, codeOfResult(Dat.parse("$token.extra")))
        assertEquals(DatErrorCode.TOKEN_MALFORMED.code, codeOfResult(Dat.parse("+$token")))
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

    @Test
    fun unknownCidIsCertNotFound() {
        val mgr = manager(cert(cid = 1L))
        val token = DatManager.issue(cert(cid = 999L), "p", "s").getOrThrow()

        assertEquals(DatErrorCode.CERT_NOT_FOUND.code, codeOfResult(mgr.parse(token)))
    }

    @Test
    fun cidInNotFoundMessageIsHex() {
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
        assertEquals(DatErrorCode.CERT_MALFORMED.code, codeOfThrown { DatCertificate.parse("a.b.c") })
        assertEquals(
            DatErrorCode.CERT_MALFORMED.code,
            codeOfThrown { DatCertificate.parse("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA") }
        )
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
        assertEquals(
            DatErrorCode.CONFIG_ALG_UNSUPPORTED.code,
            codeOfThrown { DatCertificate.parse("ff.1.2.3.NOPE.IV-AES256-GCM.AAAA.AAAA") }
        )
        assertEquals(
            DatErrorCode.CONFIG_ALG_UNSUPPORTED.code,
            codeOfThrown { DatCertificate.parse("ff.1.2.3.ECDSA-P256.NOPE.AAAA.AAAA") }
        )
        assertEquals(
            DatErrorCode.KEY_INVALID.code,
            codeOfThrown { DatCertificate.parse("ff.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA") }
        )
    }

    @Test
    fun noCertificateAtAll() {
        val e = errorOfResult(DatManager.newInstance().issue("p", "s"))
        assertEquals(DatErrorCode.MANAGER_NO_CERTIFICATE.code, e.code)
        assertEquals(DatRetry.TRANSIENT, e.retry)
    }

    @Test
    fun issuanceWindowNotYetOpenIsTransient() {
        val mgr = manager(cert(startOffset = 3600L))

        val e = errorOfResult(mgr.issue("p", "s"))
        assertEquals(DatErrorCode.MANAGER_NO_ISSUABLE_CERTIFICATE.code, e.code)
        assertEquals(DatErrorCode.CERT_NOT_YET_ISSUABLE.code, (e.cause as DatException).code)
        assertEquals(DatRetry.TRANSIENT, e.retry)
    }

    @Test
    fun issuanceWindowClosedIsPermanent() {
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
        assertEquals(DatErrorCode.CERT_VERIFY_ONLY.code, (e.cause as DatException).code)
        assertEquals(DatRetry.PERMANENT, e.retry)
    }

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
        val crypto = DatCrypto.generate(cryAlg)
        assertEquals(0, crypto.encrypt(ByteArray(0)).size)
        assertEquals(0, crypto.decrypt(ByteArray(0)).size)
    }

    @Test
    fun everyCodeIsWellFormed() {
        for (c in DatErrorCode.entries) {
            assertTrue(c.code.startsWith("DAT_"), "${c.code} must start with DAT_")
            assertTrue(
                c.code.all { it in 'A'..'Z' || it == '_' },
                "${c.code} must be SCREAMING_SNAKE_CASE"
            )
        }
        assertEquals("DAT_TOKEN_EXPIRED", DatException(DatErrorCode.TOKEN_EXPIRED).message)
        assertEquals(
            "DAT_TOKEN_MALFORMED: bad field",
            DatException(DatErrorCode.TOKEN_MALFORMED, "bad field").message
        )
    }

    @Test
    fun causeChainIsPreserved() {
        val root = DatException(DatErrorCode.CERT_MALFORMED, "bad field")
        val wrapped = DatException(DatErrorCode.CMS_IMPORT_FAILED, null, root)

        assertEquals(DatErrorCode.CMS_IMPORT_FAILED.code, wrapped.code)
        assertSame(root, wrapped.cause)
        assertEquals(DatErrorCode.CERT_MALFORMED.code, DatException.codeOf(wrapped.cause))
    }

    @Test
    fun retryClassification() {
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
