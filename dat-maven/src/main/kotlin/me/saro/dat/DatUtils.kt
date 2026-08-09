package me.saro.dat

import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException
import java.security.SecureRandom
import java.util.*

class DatUtils {
    companion object {
        private val DE_BASE64_URL: Base64.Decoder = Base64.getUrlDecoder()
        private val EN_BASE64_URL: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()
        private val MOLD_BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray()
        private val RANDOM = SecureRandom()

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

        internal fun parseU64OrNull(s: String): ULong? {
            if (s.isEmpty()) {
                return null
            }
            for (c in s) {
                if (c < '0' || c > '9') {
                    return null
                }
            }
            return s.toULongOrNull()
        }

        internal fun parseU64HexOrNull(s: String): ULong? {
            if (s.isEmpty()) {
                return null
            }
            for (c in s) {
                if (!((c in '0'..'9') || (c in 'a'..'f') || (c in 'A'..'F'))) {
                    return null
                }
            }
            return s.toULongOrNull(radix = 16)
        }

        @JvmStatic
        fun generateRandomBase62(size: Int): String {
            return generateRandomString(size, MOLD_BASE62)
        }

        @JvmStatic
        fun generateRandomString(size: Int, mold: CharArray): String {
            if (size <= 0 || mold.isEmpty()) {
                throw DatException(DatErrorCode.CONFIG_ARGUMENT_INVALID, "size must be > 0 and mold must not be empty")
            }
            val moldLen = mold.size
            val rv = CharArray(size)
            val random = RANDOM
            for (i in rv.indices) {
                rv[i] = mold[random.nextInt(moldLen)]
            }
            return String(rv)
        }
    }
}