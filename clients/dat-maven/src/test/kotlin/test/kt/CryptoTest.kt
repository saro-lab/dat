package test.kt

import me.saro.dat.DatUtils.Companion.encodeBase64Url
import me.saro.dat.DatUtils.Companion.generateRandomBase62
import me.saro.dat.crypto.DatCrypto.Companion.fromBytes
import me.saro.dat.crypto.DatCrypto.Companion.generate
import me.saro.dat.crypto.DatCryptoAlgorithm
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.function.Executable

class CryptoTest {
    fun unit(alg: DatCryptoAlgorithm) {
        val tag = "Crypto " + alg

        val body = generateRandomBase62(100).toByteArray()
        val cryptoKey = generate(alg)
        val cryptoKeyFail = generate(alg)
        val cryptoKeyBytes = cryptoKey.toBytes()
        val cryptoKeyFrom = fromBytes(alg, cryptoKeyBytes)

        val encrypted = cryptoKeyFrom.encrypt(body)

        assert(cryptoKey.decrypt(encrypted).contentEquals(body))
        assert(cryptoKeyFrom.decrypt(encrypted).contentEquals(body))
        Assertions.assertThrows(Exception::class.java, Executable { cryptoKeyFail.decrypt(encrypted) })
        println(tag + " PASS : " + encodeBase64Url(cryptoKeyBytes))
    }

    @Test
    fun test() {
        for (algorithm in DatCryptoAlgorithm.entries) {
            for (i in 0..19) {
                unit(algorithm)
            }
        }
    }
}
