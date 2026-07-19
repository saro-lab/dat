package me.saro.dat.crypto

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
                ?: throw IllegalArgumentException("Unknown crypto algorithm: $s")
        }
    }
}
