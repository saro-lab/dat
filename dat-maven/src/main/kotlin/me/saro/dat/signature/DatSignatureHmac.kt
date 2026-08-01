package me.saro.dat.signature

import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException
import me.saro.dat.signature.DatSignatureAlgorithm.*
import org.bouncycastle.crypto.Digest
import org.bouncycastle.crypto.digests.SHA256Digest
import org.bouncycastle.crypto.digests.SHA384Digest
import org.bouncycastle.crypto.digests.SHA512Digest
import org.bouncycastle.crypto.macs.HMac
import org.bouncycastle.crypto.params.KeyParameter
import java.security.MessageDigest
import java.security.SecureRandom


class DatSignatureHmac private constructor(
    private val algorithm: DatSignatureAlgorithm,
    private val keyParameter: KeyParameter,
    private val secret: ByteArray,
) : DatSignature {

    companion object {
        private val random = SecureRandom();

        internal fun getGeneralDigest(algorithm: DatSignatureAlgorithm): Digest {
            return when (algorithm) {
                HMAC_SHA256_MFS -> SHA256Digest()
                HMAC_SHA384_MFS -> SHA384Digest()
                HMAC_SHA512_MFS -> SHA512Digest()
                else -> throw DatException(DatErrorCode.CONFIG_ALG_UNSUPPORTED, "not an hmac signature algorithm: $algorithm")
            }
        }

        internal fun getKeySize(algorithm: DatSignatureAlgorithm): Int {
            return when (algorithm) {
                HMAC_SHA256_MFS -> 32
                HMAC_SHA384_MFS -> 48
                HMAC_SHA512_MFS -> 64
                else -> throw DatException(DatErrorCode.CONFIG_ALG_UNSUPPORTED, "not an hmac signature algorithm: $algorithm")
            }
        }

        @JvmStatic
        internal fun fromKey(algorithm: DatSignatureAlgorithm, key: ByteArray): DatSignature {
            if (getKeySize(algorithm) != key.size) {
                // 예전에는 이 키 크기 오류와 아래 verify 실패가 둘 다
                // "Invalid Dat Signature" 였다. 하나는 배포 설정 문제이고
                // 다른 하나는 위조 시도다.
                throw DatException(
                    DatErrorCode.KEY_INVALID,
                    "hmac key must be ${getKeySize(algorithm)} bytes, got ${key.size}",
                )
            }
            return DatSignatureHmac(algorithm, KeyParameter(key), key)
        }

        @JvmStatic
        internal fun generate(algorithm: DatSignatureAlgorithm): DatSignature {
            val keyBytes = ByteArray(getKeySize(algorithm))
                .apply { random.nextBytes(this) }
            return fromKey(algorithm, keyBytes)
        }
    }

    override fun algorithm(): DatSignatureAlgorithm {
        return algorithm
    }

    override fun exportKey(verifyOnly: Boolean): ByteArray {
        if (verifyOnly) {
            // 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
            throw DatException(DatErrorCode.KEY_VERIFY_ONLY_UNSUPPORTED, algorithm.text)
        }
        return secret
    }

    override fun verify(body: ByteArray, signature: ByteArray): Boolean {
        // catch-all 로 false 를 돌려주면 잘못된 키 타입·손상된 핸들·라이브러리 버그가
        // 전부 "서명 불일치"(위조 시도)로 보고된다. 연산 실패는 SIG_BACKEND 로 갈라 낸다.
        val mine = try {
            sign(body)
        } catch (e: DatException) {
            throw e
        } catch (e: Exception) {
            throw DatException(DatErrorCode.SIG_BACKEND, "hmac verification failed to run", e)
        }
        // MessageDigest.isEqual is constant-time; contentEquals short-circuits
        // on the first differing byte and leaks the MAC through timing.
        return MessageDigest.isEqual(mine, signature)
    }

    override fun sign(body: ByteArray): ByteArray {
        hmac.get().run {
            reset()
            update(body, 0 , body.size)
            return ByteArray(macSize)
                .apply { doFinal(this, 0) }
        }
    }

    override fun signable(): Boolean {
        return true
    }

    override fun supportVerifyOnly(): Boolean {
        return false
    }

    override fun clone(): DatSignature {
        return fromKey(algorithm, exportKey())
    }

    private val hmac: ThreadLocal<HMac> = ThreadLocal.withInitial {
        HMac(getGeneralDigest(algorithm))
            .apply { init(keyParameter) }
    }
}