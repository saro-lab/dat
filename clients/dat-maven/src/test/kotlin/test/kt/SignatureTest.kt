package test.kt

import me.saro.dat.DatUtils.Companion.encodeBase64Url
import me.saro.dat.DatUtils.Companion.generateRandomBase62
import me.saro.dat.signature.DatSignature.Companion.fromKey
import me.saro.dat.signature.DatSignature.Companion.generate
import me.saro.dat.signature.DatSignatureAlgorithm
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class SignatureTest {
    fun unit(alg: DatSignatureAlgorithm) {
        val tag = "Signature " + alg
        val body = generateRandomBase62(100).toByteArray()
        val signatureKey = generate(alg)
        val signatureKeyFail = generate(alg)
        val keyBytes = signatureKey.exportKey(false)
        val verifyingKeyBytes = signatureKey.exportKey(signatureKey.supportVerifyOnly())
        val signatureKeyFrom = fromKey(alg, keyBytes)
        val verifyKeyFrom = fromKey(alg, verifyingKeyBytes)

        val sign = signatureKeyFrom.sign(body)

        Assertions.assertTrue(signatureKey.verify(body, sign))
        Assertions.assertTrue(signatureKeyFrom.verify(body, sign))
        Assertions.assertTrue(verifyKeyFrom.verify(body, sign))
        Assertions.assertFalse(signatureKeyFail.verify(body, sign))
        println(tag + " PASS : " + encodeBase64Url(keyBytes))
    }

    @Test
    fun test() {
        for (algorithm in DatSignatureAlgorithm.entries) {
            for (i in 0..19) {
                unit(algorithm)
            }
        }
    }
}
