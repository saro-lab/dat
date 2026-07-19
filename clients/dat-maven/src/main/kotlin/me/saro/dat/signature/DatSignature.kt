package me.saro.dat.signature

interface DatSignature: Cloneable {
    fun algorithm(): DatSignatureAlgorithm
    fun verify(body: ByteArray, signature: ByteArray): Boolean
    fun sign(body: ByteArray): ByteArray
    fun exportKey(verifyOnly: Boolean = false): ByteArray
    fun signable(): Boolean
    fun supportVerifyOnly(): Boolean
    public override fun clone(): DatSignature

    companion object {
        @JvmStatic
        fun fromKey(algorithm: DatSignatureAlgorithm, key: ByteArray): DatSignature {
            return when (algorithm) {
                DatSignatureAlgorithm.ECDSA_P256, DatSignatureAlgorithm.ECDSA_P384, DatSignatureAlgorithm.ECDSA_P521 -> {
                    DatSignatureEcdsa.fromKey(algorithm, key)
                }

                DatSignatureAlgorithm.HMAC_SHA256_MFS, DatSignatureAlgorithm.HMAC_SHA384_MFS, DatSignatureAlgorithm.HMAC_SHA512_MFS -> {
                    DatSignatureHmac.fromKey(algorithm, key)
                }
            }
        }

        @JvmStatic
        fun generate(algorithm: DatSignatureAlgorithm): DatSignature {
            return when (algorithm) {
                DatSignatureAlgorithm.ECDSA_P256, DatSignatureAlgorithm.ECDSA_P384, DatSignatureAlgorithm.ECDSA_P521 -> {
                    DatSignatureEcdsa.generate(algorithm)
                }

                DatSignatureAlgorithm.HMAC_SHA256_MFS, DatSignatureAlgorithm.HMAC_SHA384_MFS, DatSignatureAlgorithm.HMAC_SHA512_MFS -> {
                    DatSignatureHmac.generate(algorithm)
                }
            }
        }
    }
}