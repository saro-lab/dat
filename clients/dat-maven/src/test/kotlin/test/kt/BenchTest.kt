package test.kt

import me.saro.dat.DatUtils.Companion.generateRandomBase62
import me.saro.dat.Unixtime.Companion.now
import me.saro.dat.crypto.DatCryptoAlgorithm
import me.saro.dat.dat.DatCertificate
import me.saro.dat.dat.DatManager.Companion.issue
import me.saro.dat.dat.DatManager.Companion.parse
import me.saro.dat.dat.Payload
import me.saro.dat.signature.DatSignatureAlgorithm
import org.junit.jupiter.api.Test
import java.util.function.IntFunction
import java.util.stream.IntStream

class BenchTest {
    private fun stream(multiThread: Boolean, loop: Int): IntStream {
        val stream = IntStream.range(0, loop)
        return if (multiThread) stream.parallel() else stream.sequential()
    }

    fun loop(
        multiThread: Boolean,
        loop: Int,
        certificates: MutableList<DatCertificate>,
        plain: String,
        secure: String
    ) {
        println("\n" + (if (multiThread) "Multi-Thread " else "Single-Thread "))

        for (certificate in certificates) {
            val pre = certificate.signature.algorithm().toString() + " " +
                    certificate.crypto.algorithm() + " "

            var time = System.currentTimeMillis()
            val dats = stream(multiThread, loop)
                .mapToObj<String>(IntFunction { i: Int -> issue(certificate, plain, secure).getOrThrow() })
                .toList()
            println(pre + "Issue * " + dats.size + " : " + (System.currentTimeMillis() - time) + "ms")

            time = System.currentTimeMillis()
            val dat = dats.get(0)
            val payloads = stream(multiThread, loop)
                .mapToObj<Payload>(IntFunction { i: Int -> parse(certificate, dat).getOrThrow() })
                .toList()

            println(pre + "Parse * " + payloads.size + " : " + (System.currentTimeMillis() - time) + "ms")

            assert(plain == payloads.get(0)!!.plain)
            assert(secure == payloads.get(0)!!.secure)
        }
    }

    @Test
    fun test() {
        val loop = 10000
        val now = now()
        val plain = generateRandomBase62(100)
        val secure = generateRandomBase62(100)

        println("Plain : " + plain)
        println("Secure : " + secure)

        val certificates: MutableList<DatCertificate> = DatSignatureAlgorithm.entries.stream()
            .flatMap<DatCertificate> { sa: DatSignatureAlgorithm? ->
                DatCryptoAlgorithm.entries.stream().map<DatCertificate> { ca: DatCryptoAlgorithm? ->
                    DatCertificate.generate(
                        0,
                        now - 10,
                        200,
                        100,
                        sa!!,
                        ca!!
                    )
                }
            }.toList()

        loop(true, loop, certificates, plain, secure)
        loop(false, loop, certificates, plain, secure)
    }
}
