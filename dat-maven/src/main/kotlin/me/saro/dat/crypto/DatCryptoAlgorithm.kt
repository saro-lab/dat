package me.saro.dat.crypto

import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException

enum class DatCryptoAlgorithm(val text: String) {
    IV_AES128_GCM("IV-AES128-GCM"),
    IV_AES256_GCM("IV-AES256-GCM");

    override fun toString(): String {
        return text
    }

    companion object {
        @JvmStatic
        fun fromString(s: String): DatCryptoAlgorithm {
            return entries.find { it.text == s }
                ?: throw DatException(DatErrorCode.CONFIG_ALG_UNSUPPORTED, "unknown crypto algorithm: $s")
        }
    }
}
