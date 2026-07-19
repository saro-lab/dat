package me.saro.dat.signature

import me.saro.dat.exception.DatException
import me.saro.dat.signature.DatSignatureAlgorithm.*
import org.bouncycastle.jcajce.provider.asymmetric.ec.BCECPrivateKey
import org.bouncycastle.jcajce.provider.asymmetric.ec.BCECPublicKey
import org.bouncycastle.jce.ECNamedCurveTable
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.jce.spec.ECPrivateKeySpec
import org.bouncycastle.jce.spec.ECPublicKeySpec
import java.math.BigInteger
import java.security.*
import java.security.spec.ECGenParameterSpec


class DatSignatureEcdsa private constructor(
    private val algorithm: DatSignatureAlgorithm,
    private val signingKey: BCECPrivateKey?,
    private val verifyingKey: BCECPublicKey,
) : DatSignature {

    companion object {
        private val BOUNCY_CASTLE_PROVIDER = BouncyCastleProvider().apply { Security.addProvider(this) }

        internal fun getPrivateKeySize(algorithm: DatSignatureAlgorithm): Int {
            return when (algorithm) {
                ECDSA_P256 -> 32
                ECDSA_P384 -> 48
                ECDSA_P521 -> 66
                else -> throw IllegalArgumentException("Unsupported algorithm: $algorithm")
            }
        }

        internal fun getPublicKeySize(algorithm: DatSignatureAlgorithm): Int {
            return when (algorithm) {
                ECDSA_P256 -> 65
                ECDSA_P384 -> 97
                ECDSA_P521 -> 133
                else -> throw IllegalArgumentException("Unsupported algorithm: $algorithm")
            }
        }

        @JvmStatic
        internal fun fromKey(algorithm: DatSignatureAlgorithm, key: ByteArray): DatSignature {
            val spec = ECNamedCurveTable.getParameterSpec(getECGenParameterSpecName(algorithm))
            val kf: KeyFactory = getKeyFactory(algorithm)
            val privateKeySize = getPrivateKeySize(algorithm)
            val publicKeySize = getPublicKeySize(algorithm)

            val signingKey = if (key.size == privateKeySize + publicKeySize) {
                val pk = key.sliceArray(0 until privateKeySize);
                kf.generatePrivate(ECPrivateKeySpec(BigInteger(1, pk), spec))
            } else if (key.size == publicKeySize) {
                null
            } else {
                throw DatException("Invalid Dat Signature Key Size: $algorithm ${key.size}")
            }

            val verifyKeyByte = if (key.size == publicKeySize) {
                key
            } else {
                key.sliceArray(privateKeySize until key.size)
            }

            val point = spec.curve.decodePoint(verifyKeyByte)
            val pubSpec = ECPublicKeySpec(point, spec)
            val verifyingKey = kf.generatePublic(pubSpec)

            return DatSignatureEcdsa(algorithm, signingKey as BCECPrivateKey?, verifyingKey as BCECPublicKey)
        }

        @JvmStatic
        internal fun generate(algorithm: DatSignatureAlgorithm): DatSignature {
            val kpg: KeyPairGenerator = KeyPairGenerator.getInstance("EC", BOUNCY_CASTLE_PROVIDER)
                .apply { initialize(ECGenParameterSpec(getECGenParameterSpecName(algorithm))) }
            val keyPair: KeyPair = kpg.generateKeyPair()
            return DatSignatureEcdsa(algorithm, keyPair.private as BCECPrivateKey, keyPair.public as BCECPublicKey)
        }

        private fun getKeyFactory(algorithm: DatSignatureAlgorithm): KeyFactory {
            return when (algorithm) {
                ECDSA_P256, ECDSA_P384, ECDSA_P521 -> KeyFactory.getInstance("EC", BOUNCY_CASTLE_PROVIDER)
                else -> throw IllegalArgumentException("Unsupported algorithm: $algorithm")
            }
        }

        private fun getSignature(algorithm: DatSignatureAlgorithm): Signature {
            return when (algorithm) {
                ECDSA_P256 -> Signature.getInstance("SHA256withPLAIN-ECDSA", BOUNCY_CASTLE_PROVIDER)
                ECDSA_P384 -> Signature.getInstance("SHA384withPLAIN-ECDSA", BOUNCY_CASTLE_PROVIDER)
                ECDSA_P521 -> Signature.getInstance("SHA512withPLAIN-ECDSA", BOUNCY_CASTLE_PROVIDER)
                else -> throw IllegalArgumentException("Unsupported algorithm: $algorithm")
            }
        }

        private fun getECGenParameterSpecName(algorithm: DatSignatureAlgorithm): String {
            return when (algorithm) {
                ECDSA_P256 -> "secp256r1"
                ECDSA_P384 -> "secp384r1"
                ECDSA_P521 -> "secp521r1"
                else -> throw IllegalArgumentException("Unsupported algorithm: $algorithm")
            }
        }

        private fun getBitSize(algorithm: DatSignatureAlgorithm): Int {
            return when (algorithm) {
                ECDSA_P256 -> 256
                ECDSA_P384 -> 384
                ECDSA_P521 -> 521
                else -> throw IllegalArgumentException("Unsupported algorithm: $algorithm")
            }
        }
    }

    override fun algorithm(): DatSignatureAlgorithm {
        return algorithm
    }

    override fun exportKey(verifyOnly: Boolean): ByteArray {
        val vo = verifyOnly || signingKey == null

        val vk = (verifyingKey).q.getEncoded(false)
        if (vo) {
            return vk
        } else {
            val key = (signingKey)
            val d = key.d
            val fieldSize = (getBitSize(algorithm) + 7) / 8
            val bytes = d.toByteArray()
            return when {
                bytes.size > fieldSize -> {
                    (bytes.copyOfRange(bytes.size - fieldSize, bytes.size))
                }
                bytes.size < fieldSize -> {
                    (ByteArray(fieldSize - bytes.size) + bytes)
                }
                else -> {
                    bytes
                }
            } + vk
        }
    }

    private val threadSignature: ThreadLocal<Signature> = ThreadLocal.withInitial { getSignature(algorithm) }

    override fun verify(body: ByteArray, signature: ByteArray): Boolean {
        try {
            val instant: Signature = threadSignature.get()
            instant.initVerify(verifyingKey)
            instant.update(body)
            return instant.verify(signature)
        } catch (e: Exception) {
            return false
        }
    }

    override fun sign(body: ByteArray): ByteArray {
        if (signingKey != null) {
            val signature: Signature = threadSignature.get()
            signature.initSign(signingKey)
            signature.update(body)
            return signature.sign()
        }
        throw DatException("VerifyingKey Only Key: Is not Have Signing Key")
    }

    override fun signable(): Boolean {
        return this.signingKey != null
    }

    override fun supportVerifyOnly(): Boolean {
        return true
    }

    override fun clone(): DatSignature {
        return fromKey(algorithm, exportKey())
    }
}