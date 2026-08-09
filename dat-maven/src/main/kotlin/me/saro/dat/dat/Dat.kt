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
            if (dat.isNullOrEmpty()) {
                return DatResult.failure(DatException(DatErrorCode.TOKEN_MALFORMED, "token is empty"))
            }
            val parts = dat.split('.')
            if (parts.size != 5) {
                return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "expected exactly 5 dot-separated fields")
                )
            }

            val expire = DatUtils.parseU64OrNull(parts[0])
                ?: return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "expire field is not a plain decimal u64")
                )

            if (expire <= Unixtime.now().toULong()) {
                return DatResult.failure(DatException(DatErrorCode.TOKEN_EXPIRED))
            }

            val cid = DatUtils.parseU64HexOrNull(parts[1])
                ?: return DatResult.failure(
                    DatException(DatErrorCode.TOKEN_MALFORMED, "cid field is not a plain hex u64")
                )

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
