package me.saro.dat.dat

import me.saro.dat.DatUtils
import me.saro.dat.Unixtime
import me.saro.dat.exception.DatException
import me.saro.dat.exception.DatResult
import org.slf4j.LoggerFactory
import java.util.concurrent.locks.ReentrantReadWriteLock
import java.util.stream.Collectors
import kotlin.concurrent.read
import kotlin.concurrent.write

class DatManager private constructor(
    private var issuer: DatCertificate? = null,
    private var certificates: List<DatCertificate> = emptyList(),
) {
    private val lock = ReentrantReadWriteLock()
    private var certificateMap: Map<ULong, DatCertificate> = emptyMap()

    fun issue(plain: ByteArray, secure: ByteArray): DatResult<String> {
        return DatResult.runCatchingResult {
            lock.read {
                if (issuer != null) {
                    issue(issuer!!, plain, secure)
                } else {
                    DatResult.failure(DatException("Not Found IssuanceKey(SigningKey)"))
                }
            }
        }
    }

    fun issue(plain: String, secure: String): DatResult<String> {
        return issue(plain.toByteArray(Charsets.UTF_8), secure.toByteArray(Charsets.UTF_8))
    }

    fun parse(dat: Dat): DatResult<Payload> {
        return DatResult.runCatchingResult {
            lock.read {
                findUnsafeThread(dat.cid).fold(
                    onSuccess = { certificate -> parse(certificate, dat) },
                )
            }
        }
    }

    fun parse(dat: String?): DatResult<Payload> {
        return Dat.parse(dat).fold(
            onSuccess = { parsedDat -> parse(parsedDat) },
        )
    }

    fun parseWithoutVerifying(dat: Dat): DatResult<Payload> {
        return DatResult.runCatchingResult {
            lock.read {
                findUnsafeThread(dat.cid).fold(
                    onSuccess = { certificate -> parseWithoutVerifying(certificate, dat) },
                )
            }
        }
    }

    fun parseWithoutVerifying(dat: String?): DatResult<Payload> {
        return Dat.parse(dat).fold(
            onSuccess = { parsedDat -> parseWithoutVerifying(parsedDat) },
        )
    }

    internal fun findUnsafeThread(cid: ULong): DatResult<DatCertificate> {
        return certificateMap[cid]
            ?.run { DatResult.success(this) }
            ?: DatResult.failure(DatException("Not Found CID(Certificate ID): $cid"))
    }

    fun exportsIds(): List<Long> {
        return lock.read { certificates.map { it.cid.toLong() } }
    }

    fun exportsCertificates(): List<DatCertificate> {
        return lock.read {
            certificates.map { it.clone() }
        }
    }

    fun exports(verifyOnly: Boolean): String {
        return lock.read {
            certificates.joinToString("\n") { it.exports(verifyOnly) }
        }
    }

    fun imports(format: String, clear: Boolean): Int {
        val list = if (format.isNotBlank()) {
            format.lineSequence()
                .filter { it.isNotBlank() }
                .map { DatCertificate.parse(it) }
                .toList()
        } else {
            listOf()
        }
        return imports(list, clear)
    }

    fun imports(certificates: List<DatCertificate>, clear: Boolean): Int {
        if (certificates.size != certificates.distinctBy { it.cid }.size) {
            log.error("Duplicate CID(Certificate ID)")
            throw IllegalArgumentException("Duplicate CID(Certificate ID)")
        }

        var renew: Int = 0
        val list = if (clear) {
            certificates.stream()
        } else {
            val inList = exportsCertificates().toMutableList()
            for (certificate in certificates) {
                if (!inList.contains(certificate)) {
                    renew++
                    inList.add(certificate)
                }
            }
            inList.stream()
        }.filter { !it.expired }
            .sorted(Comparator.comparing { it.datIssuanceEndSeconds })
            .collect(Collectors.toList())

        val issuer: DatCertificate? = list.findLast { it.issuable }?.clone()

        val map = HashMap<ULong, DatCertificate>(list.size * 2)
        for (certificate in list) {
            map[certificate.cid] = certificate
        }

        lock.write {
            this.certificates = list
            this.certificateMap = map
            this.issuer = issuer
        }
        return renew
    }

    companion object {
        private val DOT = '.'.code.toByte()
        private val log = LoggerFactory.getLogger(DatManager::class.java)

        @JvmStatic
        fun newInstance(): DatManager {
            return DatManager()
        }

        @JvmStatic
        internal fun newInstance(certificates: List<DatCertificate>): DatManager {
            return newInstance().apply { imports(certificates, true) }
        }

        @JvmStatic
        fun issue(certificate: DatCertificate, plain: ByteArray, secure: ByteArray): DatResult<String> {
            return DatResult.runCatching {
                val expire = (Unixtime.now().toULong() + certificate.datTtlSeconds).toString().toByteArray()
                val cid = certificate.cidHexBytes
                val plainBase64 = DatUtils.encodeBase64UrlBytes(plain)
                val secureBase64 = DatUtils.encodeBase64UrlBytes(certificate.crypto.encrypt(secure))

                // expire.cid.plain.secure
                val bodyLen = expire.size + cid.size + plainBase64.size + secureBase64.size + 3
                val body = ByteArray(bodyLen)
                var pos = 0
                System.arraycopy(expire, 0, body, pos, expire.size); pos += expire.size
                body[pos++] = DOT
                System.arraycopy(cid, 0, body, pos, cid.size); pos += cid.size
                body[pos++] = DOT
                System.arraycopy(plainBase64, 0, body, pos, plainBase64.size); pos += plainBase64.size
                body[pos++] = DOT
                System.arraycopy(secureBase64, 0, body, pos, secureBase64.size)

                // expire.cid.plain.secure.sign
                val sign: ByteArray = DatUtils.encodeBase64UrlBytes(certificate.signature.sign(body))
                val dat = body.copyOf(bodyLen + sign.size + 1)
                dat[bodyLen] = DOT
                System.arraycopy(sign, 0, dat, bodyLen + 1, sign.size)

                String(dat, Charsets.ISO_8859_1)
            }
        }

        @JvmStatic
        fun issue(certificate: DatCertificate, plain: String, secure: String): DatResult<String> {
            return issue(certificate, plain.toByteArray(Charsets.UTF_8), secure.toByteArray(Charsets.UTF_8))
        }

        @JvmStatic
        fun parse(certificate: DatCertificate, dat: Dat): DatResult<Payload> {
            if (!certificate.signature.verify(dat.body, dat.signatureBytes)) {
                return DatResult.failure(DatException("Invalid Dat Signature"))
            }
            return parseWithoutVerifying(certificate, dat)
        }

        @JvmStatic
        fun parse(certificate: DatCertificate, dat: String?): DatResult<Payload> {
            return Dat.parse(dat).fold(
                onSuccess = { parsedDat -> parse(certificate, parsedDat) },
            )
        }

        @JvmStatic
        fun parseWithoutVerifying(certificate: DatCertificate, dat: Dat): DatResult<Payload> {
            return DatResult.runCatching {
                Payload(dat.plainBytes, certificate.crypto.decrypt(dat.secureBytes))
            }
        }

        @JvmStatic
        fun parseWithoutVerifying(certificate: DatCertificate, dat: String?): DatResult<Payload> {
            return Dat.parse(dat).fold(
                onSuccess = { parsedDat -> parseWithoutVerifying(certificate, parsedDat) },
            )
        }
    }
}