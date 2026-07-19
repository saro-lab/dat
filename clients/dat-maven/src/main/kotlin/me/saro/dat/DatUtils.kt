package me.saro.dat

import java.util.*
import java.util.concurrent.ThreadLocalRandom

class DatUtils {
    companion object {
        private val DE_BASE64_URL: Base64.Decoder = Base64.getUrlDecoder()
        private val EN_BASE64_URL: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()
        private val MOLD_BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray()

        @JvmStatic
        fun encodeBase64Url(bytes: ByteArray): String {
            if (bytes.isEmpty()) {
                return ""
            }
            return EN_BASE64_URL.encodeToString(bytes)
        }

        @JvmStatic
        fun encodeBase64UrlBytes(bytes: ByteArray): ByteArray {
            if (bytes.isEmpty()) {
                return ByteArray(0)
            }
            return EN_BASE64_URL.encode(bytes)
        }

        @JvmStatic
        fun decodeBase64Url(str: String): ByteArray {
            if (str.isEmpty()) {
                return ByteArray(0)
            }
            return DE_BASE64_URL.decode(str)
        }

        @JvmStatic
        fun generateRandomBase62(size: Int): String {
            return generateRandomString(size, MOLD_BASE62)
        }

        @JvmStatic
        fun generateRandomString(size: Int, mold: CharArray): String {
            if (size <= 0 || mold.isEmpty()) {
                throw IllegalArgumentException("invalid size or mold")
            }
            val moldLen = mold.size
            val rv = CharArray(size)
            val random = ThreadLocalRandom.current()
            for (i in rv.indices) {
                rv[i] = mold[random.nextInt(moldLen)]
            }
            return String(rv)
        }
    }
}