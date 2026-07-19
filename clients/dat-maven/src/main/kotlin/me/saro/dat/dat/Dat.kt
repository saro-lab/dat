package me.saro.dat.dat

import me.saro.dat.DatUtils
import me.saro.dat.Unixtime
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
                return DatResult.failure(DatException.INVALID_DAT_FORMAT)
            }
            val parts = dat.split('.')
            if (parts.size != 5) {
                return DatResult.failure(DatException.INVALID_DAT_FORMAT)
            }

            val expire = parts[0].toULongOrNull()
                ?: return DatResult.failure(DatException.INVALID_DAT_FORMAT)

            if (expire < Unixtime.now().toULong()) {
                return DatResult.failure(DatException.EXPIRED_DAT)
            }

            val cid = parts[1].toULongOrNull(radix = 16)
                ?: return DatResult.failure(DatException.INVALID_DAT_FORMAT)

            return DatResult.parse(runCatching {
                val plainBytes: ByteArray = DatUtils.decodeBase64Url(parts[2])
                val secureBytes: ByteArray = DatUtils.decodeBase64Url(parts[3])
                val signatureBytes: ByteArray = DatUtils.decodeBase64Url(parts[4])
                val body: ByteArray = dat.substring(0, dat.lastIndexOf('.')).toByteArray()
                Dat(dat, expire, cid, plainBytes, secureBytes, signatureBytes, body)
            })
        }
    }
}
