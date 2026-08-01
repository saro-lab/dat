package test.kt

import me.saro.dat.Unixtime
import me.saro.dat.crypto.DatCrypto
import me.saro.dat.crypto.DatCryptoAlgorithm
import me.saro.dat.dat.Dat
import me.saro.dat.dat.DatCertificate
import me.saro.dat.dat.DatManager
import me.saro.dat.exception.DatException
import me.saro.dat.signature.DatSignature
import me.saro.dat.signature.DatSignatureAlgorithm
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

/**
 * Locks this port to the dat-rust reference behaviour.
 * Covers A-1, A-3, A-4, A-6, A-7, E-1 and M-13 - each test names the rust rule it mirrors.
 */
class RustParityTest {
    private fun cert(alg: DatSignatureAlgorithm) = DatCertificate.generate(
        1L, Unixtime.now() - 10, 200, 100, alg, DatCryptoAlgorithm.IV_AES256_GCM
    )

    @Test
    fun a6_hmacVerifyOnlyThrowsThroughManager() {
        val hmac = cert(DatSignatureAlgorithm.HMAC_SHA256_MFS)
        assertFalse(hmac.supportVerifyOnly(), "A-6: HMAC supportVerifyOnly must be false")
        assertThrows(DatException::class.java) { hmac.exports(true) }
        val mgr = DatManager.newInstance()
        mgr.imports(listOf(hmac), true)
        // must NOT silently drop the HMAC cert - the error has to reach the caller,
        // exactly as rust's export() collects into Result<_, DatError>
        assertThrows(DatException::class.java) { mgr.exports(true) }

        val ecdsa = cert(DatSignatureAlgorithm.ECDSA_P256)
        assertTrue(ecdsa.supportVerifyOnly())
        val full = ecdsa.exports(false).split(".")[6]
        val vo = ecdsa.exports(true).split(".")[6]
        assertTrue(vo.length < full.length, "A-6: verify-only ECDSA key must be shorter (public only)")
    }

    @Test
    fun m13_negativeLongRejectedBeforeConversion() {
        val sig = DatSignature.generate(DatSignatureAlgorithm.HMAC_SHA256_MFS)
        val cry = DatCrypto.generate(DatCryptoAlgorithm.IV_AES256_GCM)
        assertThrows(DatException::class.java) { DatCertificate.new(1L, -1L, 200L, 100L, sig.clone(), cry.clone()) }
        assertThrows(DatException::class.java) { DatCertificate.new(1L, 100L, -1L, 100L, sig.clone(), cry.clone()) }
        assertThrows(DatException::class.java) { DatCertificate.new(1L, 100L, 200L, -1L, sig.clone(), cry.clone()) }
        // negative cid stays legal: u64 wire value above Long.MAX_VALUE
        val c = DatCertificate.new(-1L, 100L, 200L, 100L, sig.clone(), cry.clone())
        assertEquals("ffffffffffffffff", c.exports(false).split(".")[0])
    }

    @Test
    fun a7_rustParityBoundaries() {
        val sig = DatSignature.generate(DatSignatureAlgorithm.HMAC_SHA256_MFS)
        val cry = DatCrypto.generate(DatCryptoAlgorithm.IV_AES256_GCM)
        // rust DatCertificate::from accepts duration == 0 and ttl == 0
        DatCertificate.new(1UL, 100UL, 0UL, 0UL, sig.clone(), cry.clone())
        // rust rejects only u64 overflow
        assertThrows(DatException::class.java) {
            DatCertificate.new(1UL, ULong.MAX_VALUE, 1UL, 1UL, sig.clone(), cry.clone())
        }
        assertThrows(DatException::class.java) {
            DatCertificate.new(1UL, ULong.MAX_VALUE - 1UL, 1UL, 1UL, sig.clone(), cry.clone())
        }
    }

    @Test
    fun a4_strictNumberParsing() {
        val c = cert(DatSignatureAlgorithm.HMAC_SHA256_MFS)
        val parts = c.exports(false).split(".").toMutableList()
        assertNotNull(DatCertificate.parse(parts.joinToString(".")))
        parts[1] = "+" + parts[1]
        assertThrows(DatException::class.java) { DatCertificate.parse(parts.joinToString(".")) }

        val dat = DatManager.issue(c, "a", "b").getOrThrow()
        val dp = dat.split(".").toMutableList()
        assertTrue(Dat.parse(dat).isSuccess)
        dp[0] = "+" + dp[0]
        assertTrue(Dat.parse(dp.joinToString(".")).isFailure)
    }

    @Test
    fun a3_expireAtExactSecondIsExpired() {
        // rust dat.rs: filter(|x| *x > now) - accepted only while expire > now
        val body = "${Unixtime.now()}.1.QQ.QQ.QQ"
        assertTrue(Dat.parse(body).isFailure)
    }

    @Test
    fun e1_durationRoundTrip() {
        val c = cert(DatSignatureAlgorithm.HMAC_SHA256_MFS)
        val r = DatCertificate.parse(c.exports(false))
        assertEquals(c.exports(false), r.exports(false))
        assertTrue(r.issuable, "E-1: parsed certificate must stay issuable")
        assertFalse(r.expired)
    }

    @Test
    fun a1_emptySecureRoundTrip() {
        val c = cert(DatSignatureAlgorithm.HMAC_SHA256_MFS)
        val dat = DatManager.issue(c, "hello", "").getOrThrow()
        assertEquals("hello", DatManager.parse(c, dat).getOrThrow().plain)
        assertEquals("", DatManager.parse(c, dat).getOrThrow().secure)
        val dat2 = DatManager.issue(c, "", "").getOrThrow()
        assertEquals("", DatManager.parse(c, dat2).getOrThrow().plain)
        assertEquals("", DatManager.parse(c, dat2).getOrThrow().secure)
    }
}
