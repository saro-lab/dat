package me.saro.dat.dat

import me.saro.dat.DatUtils
import me.saro.dat.Unixtime
import me.saro.dat.crypto.DatCrypto
import me.saro.dat.crypto.DatCryptoAlgorithm
import me.saro.dat.exception.DatErrorCode
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
        return signature.supportVerifyOnly()
    }

    fun exports(verifyOnly: Boolean = false): String {
        return StringBuilder()
            .append(cidHex).append('.')
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
            if (datIssuanceStartSeconds < 0L) {
                throw DatException(DatErrorCode.CONFIG_ARGUMENT_INVALID, "datIssuanceStartSeconds must be >= 0")
            }
            if (datIssuanceDurationSeconds < 0L) {
                throw DatException(DatErrorCode.CONFIG_ARGUMENT_INVALID, "datIssuanceDurationSeconds must be >= 0")
            }
            if (datTtlSeconds < 0L) {
                throw DatException(DatErrorCode.CONFIG_ARGUMENT_INVALID, "datTtlSeconds must be >= 0")
            }
            return new(cid.toULong(), datIssuanceStartSeconds.toULong(), datIssuanceDurationSeconds.toULong(), datTtlSeconds.toULong(), signatureKey, cryptoKey)
        }

        @JvmStatic
        fun new(cid: ULong, datIssuanceStartSeconds: ULong, datIssuanceDurationSeconds: ULong, datTtlSeconds: ULong, signatureKey: DatSignature, cryptoKey: DatCrypto): DatCertificate {
            if (datIssuanceDurationSeconds > ULong.MAX_VALUE - datIssuanceStartSeconds) {
                throw DatException(DatErrorCode.CERT_MALFORMED, "issuance_start_seconds + issuance_duration_seconds overflowed u64")
            }
            val datIssuanceEndSeconds = datIssuanceStartSeconds + datIssuanceDurationSeconds
            if (datTtlSeconds > ULong.MAX_VALUE - datIssuanceEndSeconds) {
                throw DatException(DatErrorCode.CERT_MALFORMED, "issuance_start_seconds + issuance_duration_seconds + dat_ttl_seconds overflowed u64")
            }
            return DatCertificate(
                cid,
                signatureKey,
                cryptoKey,
                datIssuanceStartSeconds,
                datIssuanceEndSeconds,
                datTtlSeconds,
            )
        }

        @JvmStatic
        fun parse(format: String): DatCertificate {
            val parts: List<String> = format.split(".")
            if (parts.size != 8) {
                throw DatException(DatErrorCode.CERT_MALFORMED, "expected exactly 8 dot-separated fields")
            }

            val cid = DatUtils.parseU64HexOrNull(parts[0])
                ?: throw DatException(DatErrorCode.CERT_MALFORMED, "cid field is not a plain hex u64")
            val datIssuanceStartSeconds = DatUtils.parseU64OrNull(parts[1])
                ?: throw DatException(DatErrorCode.CERT_MALFORMED, "issuance_start_seconds field is not a plain decimal u64")
            val datIssuanceDurationSeconds = DatUtils.parseU64OrNull(parts[2])
                ?: throw DatException(DatErrorCode.CERT_MALFORMED, "issuance_duration_seconds field is not a plain decimal u64")
            val datTtlSeconds = DatUtils.parseU64OrNull(parts[3])
                ?: throw DatException(DatErrorCode.CERT_MALFORMED, "dat_ttl_seconds field is not a plain decimal u64")

            val signatureAlgorithm = DatSignatureAlgorithm.fromString(parts[4])
            val cryptAlgorithm = DatCryptoAlgorithm.fromString(parts[5])

            val signatureKeyBytes = try {
                DatUtils.decodeBase64Url(parts[6])
            } catch (e: Exception) {
                throw DatException(DatErrorCode.CERT_MALFORMED, "signature_key field is not base64url", e)
            }
            val cryptoKeyBytes = try {
                DatUtils.decodeBase64Url(parts[7])
            } catch (e: Exception) {
                throw DatException(DatErrorCode.CERT_MALFORMED, "crypto_key field is not base64url", e)
            }

            val signatureKey = DatSignature.fromKey(signatureAlgorithm, signatureKeyBytes)
            val cryptoKey = DatCrypto.fromBytes(cryptAlgorithm, cryptoKeyBytes)

            return new(
                cid,
                datIssuanceStartSeconds,
                datIssuanceDurationSeconds,
                datTtlSeconds,
                signatureKey,
                cryptoKey,
            )
        }
    }
}