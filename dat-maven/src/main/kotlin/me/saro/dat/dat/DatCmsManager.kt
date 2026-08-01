package me.saro.dat.dat

import me.saro.dat.exception.DatErrorCode
import me.saro.dat.exception.DatException
import me.saro.dat.exception.DatResult
import me.saro.dat.exception.DatRetry
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.locks.ReentrantReadWriteLock

class DatCmsManager private constructor(
    private val uri: String,
    private var token: String,
    private var version: Long,
    private val manager: DatManager,
    private val client: HttpClient,
    private val scheduler: ScheduledExecutorService?,
) {
    private val lock = ReentrantReadWriteLock()
    private val sync = Runnable { sync() }

    /**
     * 마지막 동기화 실패. 한 번도 성공하지 못했으면 [DatErrorCode.CMS_NOT_SYNCED],
     * 정상이면 null 이다.
     *
     * 최초 sync 실패를 삼키고 "인증서 0개 매니저"를 성공 반환하던 동작은 그대로 두되
     * (list.md F-3), 실패가 로그로만 남던 것을 조회 가능하게 한다.
     */
    private val lastErrorRef = AtomicReference<DatException?>(DatException(DatErrorCode.CMS_NOT_SYNCED))

    fun getManager() = manager

    /** 마지막 동기화 실패. 재시도 여부는 `lastError()?.retry` 로 판정한다. */
    fun lastError(): DatException? = lastErrorRef.get()

    fun getVersion(): Long = version

    fun issue(plain: ByteArray, secure: ByteArray): DatResult<String> = manager.issue(plain, secure)

    fun issue(plain: String, secure: String): DatResult<String> = manager.issue(plain, secure)

    fun parse(dat: Dat): DatResult<Payload> = manager.parse(dat)

    fun parse(dat: String?): DatResult<Payload> = manager.parse(dat)

    fun parseWithoutVerifying(dat: Dat): DatResult<Payload> = manager.parseWithoutVerifying(dat)

    fun parseWithoutVerifying(dat: String?): DatResult<Payload> = manager.parseWithoutVerifying(dat)

    /**
     * 동기화를 한 번 수행한다. 실패해도 예외를 던지지 않는다 — 기존 호출부가 갑자기
     * 예외를 받지 않도록. 실패는 [lastError] 로 조회한다.
     */
    fun sync() {
        val error = syncOrError()
        when {
            error == null -> lastErrorRef.set(null)
            // 상태 신호는 실패로 기록하지 않는다 — 이전 동기화가 도는 중일 뿐이다.
            error.retry == DatRetry.STATE -> Unit
            else -> {
                lastErrorRef.set(error)
                log.error("[CRITICAL] DAT CMS SYNC {}: {}", uri, error.message)
            }
        }
    }

    private fun syncOrError(): DatException? {
        if (!lock.writeLock().tryLock()) {
            log.debug("cms sync skipped, previous sync still running: {}", uri)
            return DatException(DatErrorCode.CMS_SYNC_IN_PROGRESS)
        }
        val newUrl = "$uri?version=$version"
        try {
            val request: HttpRequest = HttpRequest.newBuilder()
                .uri(URI.create(newUrl))
                .header("Authorization", token)
                .build()

            // 연결 거부·DNS 실패·TLS 실패·타임아웃이 전부 여기로 온다. 전부 일시적이다.
            val result = try {
                client.send(request, HttpResponse.BodyHandlers.ofString())
            } catch (e: Exception) {
                return DatException(DatErrorCode.CMS_UNREACHABLE, "cannot reach $uri", e)
            }

            // HTTP 상태를 갈라 낸다. 예전에는 전부 로그 한 줄이라 401(영구)에도
            // 60초마다 영원히 재시도했다.
            val status = result.statusCode()
            if (status < 200 || status > 299) {
                return httpStatusError(status)
            }

            val body = result.body()
            val iof = body.indexOf("\n")
            if (iof == 0) {
                return DatException(DatErrorCode.CMS_MALFORMED, "response has no version line")
            } else if (iof > 0) {
                val versionLine = body.substring(0, iof).trim()
                // 예전에는 toLong() 이 그대로 NumberFormatException 을 던져 아래
                // catch-all 로 빨려 들어갔다.
                val newVersion = versionLine.toLongOrNull()
                    ?: return DatException(
                        DatErrorCode.CMS_MALFORMED, "version line is not a plain decimal integer"
                    )
                // 서버가 우리보다 과거 버전을 돌려주면 전체 재동기화 지시다. 오류가
                // 아니라 상태 신호이며, 아래 imports 가 clear=true 라 그 자체로 처리된다.
                if (newVersion < version) {
                    log.warn(
                        "{}: server rolled version back {} -> {}",
                        DatErrorCode.CMS_VERSION_RESET.code, version, newVersion
                    )
                }
                val newCertificates = body.substring(iof + 1).trim()
                // 인증서 적용 실패의 원인(CERT_*/KEY_*)을 버리지 않고 체이닝한다.
                val renew = try {
                    manager.imports(newCertificates, true)
                } catch (e: Exception) {
                    return DatException(DatErrorCode.CMS_IMPORT_FAILED, "cannot apply received certificates", e)
                }
                version = newVersion
                log.debug("renew {} certificates: {}", renew, newUrl)
            } else {
                log.debug("no new certificate: {}", newUrl)
            }
            return null
        } finally {
            lock.writeLock().unlock()
        }
    }

    companion object {
        private val log: Logger = LoggerFactory.getLogger(DatCmsManager::class.java)
        private const val DAT_CMS_API_VERSION = "v1"

        @JvmStatic
        fun builder(): DatCmsManagerBuilder = DatCmsManagerBuilder()

        internal fun httpStatusError(status: Int): DatException = when {
            status == 401 -> DatException(DatErrorCode.CMS_UNAUTHORIZED, "http 401")
            status == 403 -> DatException(DatErrorCode.CMS_FORBIDDEN, "http 403")
            status == 404 -> DatException(DatErrorCode.CMS_ENDPOINT_NOT_FOUND, "http 404")
            status in 500..599 -> DatException(DatErrorCode.CMS_SERVER_ERROR, "http $status")
            else -> DatException(DatErrorCode.CMS_HTTP_STATUS, "http $status")
        }
    }

    class DatCmsManagerBuilder private constructor(
        private var client: HttpClient = HttpClient.newBuilder().build(),
        private var uri: URI = URI.create("http://localhost:8088"),
        private var token: String = "",
        private var verifyOnly: Boolean = false,
        private var intervalSeconds: Long = 60L
    ) {
        constructor(): this(
            client = HttpClient.newBuilder().build()
        )

        fun uri(uri: String) = this.apply {
            this.uri = try {
                URI.create(uri)
            } catch (e: Exception) {
                throw DatException(DatErrorCode.CONFIG_URI_INVALID, "cannot be parsed as a uri", e)
            }
        }
        fun token(token: String) = this.apply { this.token = token; }
        fun verifyOnly(verifyOnly: Boolean) = this.apply { this.verifyOnly = verifyOnly; }
        fun intervalSeconds(intervalSeconds: Long) = this.apply { this.intervalSeconds = intervalSeconds; }
        fun intervalOff() = this.apply { this.intervalSeconds = 0L; }

        fun build(): DatCmsManager {
            val scheme = this.uri.scheme
            if (scheme != "http" && scheme != "https") {
                throw DatException(DatErrorCode.CONFIG_URI_INVALID, "scheme must be http or https: ${this.uri}")
            }
            if ((this.uri.path?.length ?: 0) > 1) {
                throw DatException(DatErrorCode.CONFIG_URI_INVALID, "must be path-less: ${this.uri}")
            }
            if ((this.uri.query?.length ?: 0) > 0) {
                throw DatException(DatErrorCode.CONFIG_URI_INVALID, "must be query-less: ${this.uri}")
            }
            val path = if (this.verifyOnly) {
                "/$DAT_CMS_API_VERSION/certs/verify-only"
            } else {
                "/$DAT_CMS_API_VERSION/certs"
            }
            val uri = this.uri.toString().trimEnd('/') + path

            val manager = DatManager.newInstance()

            val scheduler: ScheduledExecutorService? = if (intervalSeconds > 0) {
                Executors.newSingleThreadScheduledExecutor { runnable: Runnable ->
                    val thread = Thread(runnable)
                    thread.setDaemon(true)
                    thread.setName("dat-cms-sync-scheduler")
                    thread
                }
            } else {
                null
            }
            val cms = DatCmsManager(uri, token, 0, manager, client, scheduler)
            scheduler?.apply {
                scheduleAtFixedRate(cms.sync, intervalSeconds, intervalSeconds, TimeUnit.SECONDS)
            }
            // 최초 sync 실패는 여전히 build 를 막지 않는다. 다만 이제 조용히 사라지지
            // 않고 lastError() 로 조회할 수 있다.
            cms.sync()
            return cms
        }
    }
}
