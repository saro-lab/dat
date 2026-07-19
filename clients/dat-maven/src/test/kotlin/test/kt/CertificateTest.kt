package test.kt

import me.saro.dat.DatUtils.Companion.generateRandomBase62
import me.saro.dat.crypto.DatCryptoAlgorithm
import me.saro.dat.dat.DatCertificate
import me.saro.dat.dat.DatCertificate.Companion.generate
import me.saro.dat.dat.DatCertificate.Companion.parse
import me.saro.dat.dat.DatManager.Companion.issue
import me.saro.dat.dat.DatManager.Companion.parse
import me.saro.dat.signature.DatSignatureAlgorithm
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.function.Executable
import java.nio.charset.StandardCharsets

class CertificateTest {
    fun unit(failCert: DatCertificate, signatureAlgorithm: DatSignatureAlgorithm, cryptoAlgorithm: DatCryptoAlgorithm) {
        val plain = generateRandomBase62(30)
        val secure = generateRandomBase62(30)

        val id = (Math.random() * Long.MAX_VALUE).toLong()
        val newCert = generate(id, signatureAlgorithm, cryptoAlgorithm)
        val newCertStr = newCert.exports(false)

        val readCert = parse(newCertStr)
        println("Cert " + newCertStr)

        val dat = issue(newCert, plain, secure).getOrThrow()
        val dat2 = issue(
            newCert,
            plain.toByteArray(StandardCharsets.UTF_8),
            secure.toByteArray(StandardCharsets.UTF_8)
        ).getOrThrow()

        val payload = parse(readCert, dat).getOrThrow()
        val payload2 = parse(readCert, dat2).getOrThrow()
        println("DAT " + dat)

        assert(plain == payload.plain)
        assert(secure == payload.secure)
        assert(plain == payload2.plain)
        assert(secure == payload2.secure)
        assert(id == newCert.cidLong)
        assert(id == readCert.cidLong)
        Assertions.assertThrows(Exception::class.java, Executable { parse(failCert, dat).getOrThrow() })
    }


    fun generate(
        id: Long,
        signatureAlgorithm: DatSignatureAlgorithm,
        cryptoAlgorithm: DatCryptoAlgorithm
    ): DatCertificate {
        return generate(
            id,
            System.currentTimeMillis() - 10,
            200,
            100,
            signatureAlgorithm,
            cryptoAlgorithm
        )
    }

    @Test
    fun test() {
        val failCert = generate(
            (Math.random() * Long.MAX_VALUE).toLong(),
            DatSignatureAlgorithm.ECDSA_P256,
            DatCryptoAlgorithm.IV_AES128_GCM
        )

        for (signatureAlgorithm in DatSignatureAlgorithm.entries) {
            for (cryptoAlgorithm in DatCryptoAlgorithm.entries) {
                for (i in 0..19) {
                    unit(failCert, signatureAlgorithm, cryptoAlgorithm)
                }
            }
        }
    }
}
