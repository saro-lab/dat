package me.saro.dat.dat

import me.saro.dat.DatUtils
import me.saro.dat.Unixtime
import me.saro.dat.crypto.DatCrypto
import me.saro.dat.crypto.DatCryptoAlgorithm
import me.saro.dat.exception.DatException
import me.saro.dat.signature.DatSignature
import me.saro.dat.signature.DatSignatureAlgorithm

class DatCertificate private constructor(
    val cid: ULong,
    internal val signature: DatSignature,
    internal val crypto: DatCrypto,
    internal val datIssuanceStartSeconds: ULong,
    internal val datIssuanceEndSeconds: ULong,
    internal val datTtlSeconds: ULong,
): Cloneable {
    internal val cidHex = cid.toString(16)
    internal val cidHexBytes = cidHex.toByteArray()

    val expired: Boolean get() = (datIssuanceEndSeconds + datTtlSeconds) < Unixtime.now().toULong()

    val issuable: Boolean get() {
        return this.signable() && Unixtime.now().toULong() in datIssuanceStartSeconds..datIssuanceEndSeconds
    }

    val cidLong: Long get() = cid.toLong()

    fun signable(): Boolean {
        return signature.signable()
    }
    fun supportVerifyOnly(): Boolean {
        return signature.signable()
    }

    fun exports(verifyOnly: Boolean = false): String {
        return StringBuilder()
            .append(cidHex).append('.') // cid
            .append(datIssuanceStartSeconds).append('.')
            .append(datIssuanceEndSeconds - datIssuanceStartSeconds).append('.')
            .append(datTtlSeconds).append('.')
            .append(signature.algorithm()).append('.')
            .append(crypto.algorithm()).append('.')
            .append(DatUtils.encodeBase64Url(signature.exportKey(verifyOnly))).append('.')
            .append(DatUtils.encodeBase64Url(crypto.toBytes()))
            .toString()
    }

    override fun toString(): String {
        return exports(false)
    }

    public override fun clone(): DatCertificate {
        return DatCertificate(
            cid,
            signature.clone(),
            crypto.clone(),
            datIssuanceStartSeconds,
            datIssuanceEndSeconds,
            datTtlSeconds
        )
    }

    override fun equals(other: Any?): Boolean {
        if (other is DatCertificate) {
            return other.cid == this.cid
        }
        return false
    }

    override fun hashCode(): Int {
        return cid.hashCode()
    }

    companion object {
        @JvmStatic
        fun generate(cid: Long, datIssuanceStartSeconds: Long, datIssuanceDurationSeconds: Long, datTtlSeconds: Long, signatureAlgorithm: DatSignatureAlgorithm, cryptoAlgorithm: DatCryptoAlgorithm): DatCertificate {
            return new(
                cid,
                datIssuanceStartSeconds,
                datIssuanceDurationSeconds,
                datTtlSeconds,
                DatSignature.generate(signatureAlgorithm),
                DatCrypto.generate(cryptoAlgorithm),
            )
        }

        @JvmStatic
        fun new(cid: Long, datIssuanceStartSeconds: Long, datIssuanceDurationSeconds: Long, datTtlSeconds: Long, signatureKey: DatSignature, cryptoKey: DatCrypto): DatCertificate {
            return new(cid.toULong(), datIssuanceStartSeconds.toULong(), datIssuanceDurationSeconds.toULong(), datTtlSeconds.toULong(), signatureKey, cryptoKey)
        }

        @JvmStatic
        fun new(cid: ULong, datIssuanceStartSeconds: ULong, datIssuanceDurationSeconds: ULong, datTtlSeconds: ULong, signatureKey: DatSignature, cryptoKey: DatCrypto): DatCertificate {
            if (datIssuanceStartSeconds < 0UL) {
                throw DatException("datIssuanceStartSeconds must >= 0")
            }
            if (datTtlSeconds < 1UL) {
                throw DatException("datTtlSeconds must > 0")
            }
            if (datIssuanceDurationSeconds < 1UL) {
                throw DatException("datIssuanceDurationSeconds must > 0")
            }
            return DatCertificate(
                cid,
                signatureKey,
                cryptoKey,
                datIssuanceStartSeconds,
                datIssuanceStartSeconds + datIssuanceDurationSeconds,
                datTtlSeconds,
            )
        }

        @JvmStatic
        fun parse(format: String): DatCertificate {
            try {
                val parts: List<String> = format.split(".")
                if (parts.size == 8) {
                    val cid = parts[0].toULong(16).toLong()
                    val datIssuanceStartSeconds = parts[1].toULong().toLong()
                    val datIssuanceDurationSeconds = datIssuanceStartSeconds - parts[2].toULong().toLong()
                    val datTtlSeconds = parts[3].toULong().toLong()
                    val signatureAlgorithm = DatSignatureAlgorithm.fromString(parts[4])
                    val cryptAlgorithm = DatCryptoAlgorithm.fromString(parts[5])
                    val signatureKey = DatSignature.fromKey(signatureAlgorithm, DatUtils.decodeBase64Url(parts[6]))
                    val cryptoKey = DatCrypto.fromBytes(cryptAlgorithm, DatUtils.decodeBase64Url(parts[7]))
                    return new(
                        cid,
                        datIssuanceStartSeconds,
                        datIssuanceDurationSeconds,
                        datTtlSeconds,
                        signatureKey,
                        cryptoKey,
                    )
                }
            } catch (e: Exception) {
                if (e is DatException) {
                    throw e
                }
            }
            throw DatException("Invalid Dat Certificate Format")
        }
    }
}