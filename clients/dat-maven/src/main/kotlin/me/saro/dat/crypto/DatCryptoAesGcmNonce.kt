package me.saro.dat.crypto

import me.saro.dat.exception.DatException
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class DatCryptoAesGcmNonce private constructor(
    private val algorithm: DatCryptoAlgorithm,
    private val key: SecretKeySpec,
): DatCrypto {
    companion object {
        private const val NONCE_LEN = 12
        private const val TAG_BITS = 128
        private val RANDOM = SecureRandom()
        private val CIPHER: ThreadLocal<Cipher> = ThreadLocal.withInitial { Cipher.getInstance("AES/GCM/NoPadding") }

        private fun getKeySize(algorithm: DatCryptoAlgorithm): Int {
            return when (algorithm) {
                DatCryptoAlgorithm.IV_AES128_GCM -> 16
                DatCryptoAlgorithm.IV_AES256_GCM -> 32
            }
        }

        internal fun fromBytes(algorithm: DatCryptoAlgorithm, bytes: ByteArray): DatCrypto {
            if (bytes.size != getKeySize(algorithm)) {
                throw DatException("Invalid $algorithm Key Size: ${bytes.size}")
            }
            val key = SecretKeySpec(bytes, "AES")
            return DatCryptoAesGcmNonce(algorithm, key)
        }

        internal fun generate(algorithm: DatCryptoAlgorithm): DatCrypto {
            val rand = ByteArray(getKeySize(algorithm)).apply { RANDOM.nextBytes(this) }
            val key = SecretKeySpec(rand, "AES")
            return DatCryptoAesGcmNonce(algorithm, key)
        }
    }

    override fun algorithm(): DatCryptoAlgorithm {
        return algorithm
    }

    override fun toBytes(): ByteArray {
        return key.encoded
    }

    override fun encrypt(bytes: ByteArray): ByteArray {
        val nonce = ByteArray(NONCE_LEN).apply { RANDOM.nextBytes(this) }
        val cipher = CIPHER.get()
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(TAG_BITS, nonce))
        val rv = ByteArray(NONCE_LEN + cipher.getOutputSize(bytes.size))
        System.arraycopy(nonce, 0, rv, 0, NONCE_LEN)
        cipher.doFinal(bytes, 0, bytes.size, rv, NONCE_LEN)
        return rv
    }

    override fun decrypt(bytes: ByteArray): ByteArray {
        val cipher = CIPHER.get()
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_BITS, bytes, 0, NONCE_LEN))
        return cipher.doFinal(bytes, NONCE_LEN, bytes.size - NONCE_LEN)
    }

    override fun clone(): DatCrypto {
        return fromBytes(algorithm, toBytes())
    }
}