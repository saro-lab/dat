package test.kt

import me.saro.dat.dat.DatCmsManager.Companion.builder
import org.junit.jupiter.api.Test
import java.io.IOException

class ExampleCmsManagerTest {
    @Test
    @Throws(IOException::class, InterruptedException::class)
    fun test() {
        // singleton
        val manager = builder()
            .uri("http://localhost:8088")
            //.intervalOff() // disable auto sync
            .intervalSeconds(1)
            .token("12345678901b")
            .build()

        // manual sync
        // manager.sync();
        try {
            val plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
            val secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

            println("plain : " + plain)
            println("secure : " + secure)

            // issue dat
            val dat = manager.issue(plain, secure).getOrThrow()
            println("dat : " + dat)

            // parse dat
            val payload = manager.parse(dat).getOrThrow()

            val payloadPlain = payload.plain
            val payloadSecure = payload.secure

            println("payload plain : " + payloadPlain)
            println("payload secure : " + payloadSecure)
        } catch (e: Exception) {
            println("Ignore: is soft test: real connection test")
        }


        // wait
        Thread.sleep(5000)
    }
}
