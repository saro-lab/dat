package me.saro.dat.crypto

import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException
import javax.crypto.AEADBadTagException
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
                throw DatException(DatErrorCode.KEY_INVALID, "$algorithm key must be ${getKeySize(algorithm)} bytes, got ${bytes.size}")
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
        if (bytes.isEmpty()) {
            return ByteArray(0)
        }
        val nonce = ByteArray(NONCE_LEN).apply { RANDOM.nextBytes(this) }
        val cipher = CIPHER.get()
        return try {
            cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(TAG_BITS, nonce))
            val rv = ByteArray(NONCE_LEN + cipher.getOutputSize(bytes.size))
            System.arraycopy(nonce, 0, rv, 0, NONCE_LEN)
            cipher.doFinal(bytes, 0, bytes.size, rv, NONCE_LEN)
            rv
        } catch (e: Exception) {
            throw DatException(DatErrorCode.CRYPTO_BACKEND, "aes-gcm encrypt failed", e)
        }
    }

    override fun decrypt(bytes: ByteArray): ByteArray {
        if (bytes.isEmpty()) {
            return ByteArray(0)
        }
        if (bytes.size <= NONCE_LEN) {
            throw DatException(DatErrorCode.CRYPTO_DATA_INVALID, "ciphertext is shorter than the 12-byte iv")
        }
        val cipher = CIPHER.get()
        return try {
            cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_BITS, bytes, 0, NONCE_LEN))
            cipher.doFinal(bytes, NONCE_LEN, bytes.size - NONCE_LEN)
        } catch (e: AEADBadTagException) {
            throw DatException(DatErrorCode.CRYPTO_TAG_MISMATCH, "gcm authentication tag mismatch", e)
        } catch (e: DatException) {
            throw e
        } catch (e: Exception) {
            throw DatException(DatErrorCode.CRYPTO_BACKEND, "aes-gcm decrypt failed", e)
        }
    }

    override fun clone(): DatCrypto {
        return fromBytes(algorithm, toBytes())
    }
}