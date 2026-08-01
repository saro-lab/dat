package me.saro.dat.dat

import me.saro.dat.DatUtils
import me.saro.dat.Unixtime
import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException
import me.saro.dat.exception.DatResult

class Dat private constructor(
    val dat: String,
    internal val expire: ULong,
    internal val cid: ULong,
    internal val plainBytes: ByteArray,
    internal val secureBytes: ByteArray,
    internal val signatureBytes: ByteArray,
    internal val body: ByteArray
): Cloneable {
    fun getCid(): Long = cid.toLong()
    fun getExpire(): Long = expire.toLong()

    public override fun clone(): Dat {
        return Dat(dat, expire, cid, plainBytes.clone(), secureBytes.clone(), signatureBytes.clone(), body.clone())
    }

    companion object {
        @JvmStatic
        fun parse(dat: String?): DatResult<Dat> {
            // 1) 먼저 구조를 확정한다. 파트가 5개가 아니면 그건 만료된 토큰이 아니라
            //    애초에 토큰이 아니다.
            if (dat.isNullOrEmpty()) {
                return DatResult.failure(DatException(DatErrorCode.TOKEN_MALFORMED, "token is empty"))
            }
            val parts = dat.split('.')
            if (parts.size != 5) {
                return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "expected exactly 5 dot-separated fields")
                )
            }

            // 2) 구조가 맞은 뒤에야 값을 본다. 만료와 형식 오류를 갈라 낸다 — 예전에는
            //    INVALID_DAT_FORMAT/EXPIRED_DAT 싱글턴이라 스택 트레이스가 클래스 초기화
            //    지점을 가리켰고, 어느 필드가 왜 틀렸는지도 실을 수 없었다.
            // Strict parse: rust's parse::<u64>() rejects "+1"/" 1", toULongOrNull accepts "+1".
            val expire = DatUtils.parseU64OrNull(parts[0])
                ?: return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "expire field is not a plain decimal u64")
                )

            // rust accepts a DAT only while expire > now, so expire == now is expired.
            if (expire <= Unixtime.now().toULong()) {
                return DatResult.failure(DatException(DatErrorCode.TOKEN_EXPIRED))
            }

            val cid = DatUtils.parseU64HexOrNull(parts[1])
                ?: return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "cid field is not a plain hex u64")
                )

            // 빈 서명은 서명 자체의 형식 오류다. 위조(SIG_MISMATCH)와 구분한다.
            if (parts[4].isEmpty()) {
                return DatResult.failure(DatException(DatErrorCode.SIG_MALFORMED, "signature field is empty"))
            }

            val plainBytes: ByteArray = try {
                DatUtils.decodeBase64Url(parts[2])
            } catch (e: Exception) {
                return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "plain field is not base64url", e)
                )
            }
            val secureBytes: ByteArray = try {
                DatUtils.decodeBase64Url(parts[3])
            } catch (e: Exception) {
                return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "secure field is not base64url", e)
                )
            }
            val signatureBytes: ByteArray = try {
                DatUtils.decodeBase64Url(parts[4])
            } catch (e: Exception) {
                return DatResult.failure(
                    DatException(DatErrorCode.SIG_MALFORMED, "signature field is not base64url", e)
                )
            }

            val body: ByteArray = dat.substring(0, dat.lastIndexOf('.')).toByteArray()
            return DatResult.success(Dat(dat, expire, cid, plainBytes, secureBytes, signatureBytes, body))
        }
    }
}
