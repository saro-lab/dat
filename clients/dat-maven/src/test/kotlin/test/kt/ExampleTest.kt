package test.kt

import me.saro.dat.Unixtime.Companion.now
import me.saro.dat.crypto.DatCryptoAlgorithm
import me.saro.dat.dat.DatCertificate
import me.saro.dat.dat.DatCertificate.Companion.generate
import me.saro.dat.dat.DatManager.Companion.newInstance
import me.saro.dat.signature.DatSignatureAlgorithm
import org.junit.jupiter.api.Test
import java.io.IOException
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.List

class ExampleTest {
    @Test
    fun selfTest() {
        // Singleton Manager
        val manager = newInstance()

        val unixTime = now()

        val certificate = generate(
            0,
            unixTime - 10,
            200,
            100,
            DatSignatureAlgorithm.ECDSA_P256,
            DatCryptoAlgorithm.IV_AES128_GCM
        )

        manager.imports(List.of<DatCertificate>(certificate), false)


        // example data
        val plainData = "plain data 유니코드 !!! ABCD"
        val secureData = ">! secure data 암호화 데이터 @@@@"

        println("plain : " + plainData)
        println("secure : " + secureData)

        // issue dat
        val dat = manager.issue(plainData, secureData).getOrThrow()
        println("dat : " + dat)

        // parse dat
        val payload = manager.parse(dat).getOrThrow()

        val payloadPlain = payload.plain
        val payloadSecure = payload.secure

        println("payload plain : " + payloadPlain)
        println("payload secure : " + payloadSecure)

        assert(plainData == payloadPlain)
        assert(secureData == payloadSecure)
    }

    // @Test
    @Throws(IOException::class, InterruptedException::class)
    fun useDatCms() {
        // BEFORE: install dat-cms
        // See: https://dat.saro.me/svc/docker-saro-lab-dat-cms

        // Singleton Manager

        val manager = newInstance()

        // get certificate from dat-cms
        val client = HttpClient.newHttpClient()
        val request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:8088/certificates"))
            .build()
        val body = client.send<String>(request, HttpResponse.BodyHandlers.ofString()).body()
        println("get certificate :")
        println(body)

        // import certificate
        manager.imports(body, false)
        println("certificate " + manager.exportsIds().size + " imported.")

        // example data
        val plainData = "plain data 유니코드 !!! ABCD"
        val secureData = ">! secure data 암호화 데이터 @@@@"

        println("plain : " + plainData)
        println("secure : " + secureData)

        // issue dat
        val dat = manager.issue(plainData, secureData).getOrThrow()
        println("dat : " + dat)

        // parse dat
        val payload = manager.parse(dat).getOrThrow()

        val payloadPlain = payload.plain
        val payloadSecure = payload.secure

        println("payload plain : " + payloadPlain)
        println("payload secure : " + payloadSecure)

        assert(plainData == payloadPlain)
        assert(secureData == payloadSecure)
    }


    //@Test
    fun useDatFormat() {
        // Singleton Manager


        val manager = newInstance()

        val format =
            "0.P256.I5P_FNPSCiQrw12CXj8qYkBH_v3wFYmXBtTpmED59bs.AES128GCMN.SVz-zzee5hz9OzEHxQgEaA.1.17781627851.1800\n" +
                    "1.P256.mIA7RLJERhLD95pOpq9zxNLd98haUIbDzRR8IeWZA8c.AES128GCMN.6SnRhvQB3yh-PotQ8e_6nw.1.17781627851.1800\n" +
                    "2.P256.wRS5kklcIMdUJpCixUA4_pZNpaI1X34DK2txUGPqjd0.AES128GCMN.mCEWOK2jOWzES7LnQJtczw.1.17781627851.1800\n" +
                    "3.P256.YeX4JWaYQQh8HKctWsh6NuYtElCFRlRH1OyBOsGzdTM.AES128GCMN.42CSIN_0Zu-tpZqRvnMY7A.1.17781627851.1800\n" +
                    "4.P256.9o5N5hd6m3xHwUQhESm2-ghz1zQM9F_KI3LGqIlvvoA.AES128GCMN.ePrjtPJr25dgopD6-TgJxg.1.17781627851.1800\n" +
                    "5.P256.C9s4V_BWxxVtmoeIXsKcV4YKVmDdHcAWwVzvsEUzA0E.AES128GCMN.Kk0cQ9HLHWvfbJMAsKPXAg.1.17781627851.1800\n" +
                    "6.P256.iEqgUQRHxmFJOT1rVGK9fGleGKSsbCDo6hK7EZxVExU.AES128GCMN.u6YbhAZ5L7d6r1W3oStBjA.1.17781627851.1800\n" +
                    "7.P256.1hKGy6NQgrtvOBmb4YRZIJwoU1EPYTQPIDOkhBTx8PQ.AES128GCMN.MP0pBCEVCyeeyge6r1-VSw.1.17781627851.1800\n" +
                    "8.P256.iOEL5ERwtTmmmp7A4sVhDkTedhi4e6F53wG2xDRDEoE.AES128GCMN.VgojardW72K2jkbqNafegw.1.17781627851.1800\n" +
                    "9.P256.VPGAAvJhJ1KXkdPvz1AiWEHiCVR9u8KME0AOUso3-vI.AES128GCMN.Mfx6GnQZUzC0N4q0eB6PXQ.1.17781627851.1800"

        // import
        manager.imports(format, false)


        // example data
        val plainData = "plain data 유니코드 !!!"
        val secureData = ">! secure data 암호화 데이터"

        println("plain : " + plainData)
        println("secure : " + secureData)

        // to dat
        val dat = manager.issue(plainData, secureData).getOrThrow()
        println("dat : " + dat)

        // dat to payload
        val payload = manager.parse(dat).getOrThrow()

        val payloadPlain = payload.plain
        val payloadSecure = payload.secure

        println("payload plain : " + payloadPlain)
        println("payload secure : " + payloadSecure)

        assert(plainData == payloadPlain)
        assert(secureData == payloadSecure)
    }
}
