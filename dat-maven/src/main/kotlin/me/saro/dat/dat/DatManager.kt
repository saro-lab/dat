package me.saro.dat.dat

import me.saro.dat.DatUtils
import me.saro.dat.Unixtime
import me.saro.dat.exception.DatErrorCode
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
                } else if (certificates.isEmpty()) {
                    DatResult.failure(DatException(DatErrorCode.MANAGER_NO_CERTIFICATE))
                } else {
                    DatResult.failure(
                        DatException(
                            DatErrorCode.MANAGER_NO_ISSUABLE_CERTIFICATE,
                            null,
                            noIssuableCause(certificates),
                        )
                    )
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
            // cid 는 16진으로 통일한다. 예전에는 10진으로 찍혀 다른 포트의 로그와
            // 대조가 되지 않았다.
            ?: DatResult.failure(DatException(DatErrorCode.CERT_NOT_FOUND, "cid ${cid.toString(16)}"))
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
            // 예전에는 로그 + IllegalArgumentException 두 갈래였다. DatException 으로 통일한다.
            throw DatException(DatErrorCode.CERT_DUPLICATE_CID, "duplicate cid in the import list")
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

        /**
         * 발급 가능한 인증서가 없을 때 **왜** 없는지 가려낸다.
         *
         * 예전에는 이 다섯 가지가 `"Not Found IssuanceKey(SigningKey)"` 문자열
         * 하나였다. 대응이 전부 다르다 — 발급창 전이면 기다리면 되고, verify-only
         * 뿐이면 배포 설정 실수이며, 0건이면 CMS 접속 문제다.
         */
        internal fun noIssuableCause(certificates: List<DatCertificate>): DatException {
            val now = Unixtime.now().toULong()
            var signableSeen = false
            var notYet = false
            var ended = false

            for (certificate in certificates) {
                if (!certificate.signable()) {
                    continue
                }
                signableSeen = true
                if (now < certificate.datIssuanceStartSeconds) {
                    notYet = true
                } else if (now > certificate.datIssuanceEndSeconds) {
                    ended = true
                }
            }

            return when {
                !signableSeen -> DatException(DatErrorCode.CERT_VERIFY_ONLY)
                // 기다리면 풀리는 유일한 사유다. 하나라도 있으면 이것을 앞세운다.
                notYet -> DatException(DatErrorCode.CERT_NOT_YET_ISSUABLE)
                ended -> DatException(DatErrorCode.CERT_ISSUANCE_ENDED)
                else -> DatException(DatErrorCode.CERT_EXPIRED)
            }
        }

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
            // verify 가 false 를 돌려주는 것은 오직 불일치일 때뿐이다. 연산 실패는
            // SIG_BACKEND 예외로 올라오므로 여기서 위조로 뭉개지지 않는다.
            return try {
                if (!certificate.signature.verify(dat.body, dat.signatureBytes)) {
                    DatResult.failure(DatException(DatErrorCode.SIG_MISMATCH))
                } else {
                    parseWithoutVerifying(certificate, dat)
                }
            } catch (e: DatException) {
                DatResult.failure(e)
            }
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