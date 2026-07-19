package me.saro.dat.crypto

interface DatCrypto: Cloneable {
    fun algorithm(): DatCryptoAlgorithm
    fun toBytes(): ByteArray
    fun encrypt(bytes: ByteArray): ByteArray
    fun decrypt(bytes: ByteArray): ByteArray
    public override fun clone(): DatCrypto

    companion object {
        @JvmStatic
        fun fromBytes(algorithm: DatCryptoAlgorithm, bytes: ByteArray): DatCrypto {
            when (algorithm) {
                DatCryptoAlgorithm.IV_AES128_GCM, DatCryptoAlgorithm.IV_AES256_GCM -> {
                    return DatCryptoAesGcmNonce.fromBytes(algorithm, bytes)
                }
            }
        }

        @JvmStatic
        fun generate(algorithm: DatCryptoAlgorithm): DatCrypto {
            when (algorithm) {
                DatCryptoAlgorithm.IV_AES128_GCM, DatCryptoAlgorithm.IV_AES256_GCM -> {
                    return DatCryptoAesGcmNonce.generate(algorithm)
                }
            }
        }
    }
}
