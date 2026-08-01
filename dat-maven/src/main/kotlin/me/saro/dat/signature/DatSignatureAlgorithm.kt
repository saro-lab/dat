package me.saro.dat.signature

import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException

enum class DatSignatureAlgorithm(val text: String) {
    HMAC_SHA256_MFS("HMAC-SHA256-MFS"),
    HMAC_SHA384_MFS("HMAC-SHA384-MFS"),
    HMAC_SHA512_MFS("HMAC-SHA512-MFS"),
    ECDSA_P256("ECDSA-P256"),
    ECDSA_P384("ECDSA-P384"),
    ECDSA_P521("ECDSA-P521");

    override fun toString(): String {
        return text
    }

    companion object {
        @JvmStatic
        fun fromString(s: String): DatSignatureAlgorithm {
            return DatSignatureAlgorithm.entries.find { it.text == s }
                ?: throw DatException(DatErrorCode.CONFIG_ALG_UNSUPPORTED, "unknown signature algorithm: $s")
        }
    }
}
