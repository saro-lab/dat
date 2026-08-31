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
import java.time.Duration
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
    private val requestTimeout: Duration?,
) : AutoCloseable {
    private val lock = ReentrantReadWriteLock()
    private val sync = Runnable { sync() }

    private val lastErrorRef = AtomicReference<DatException?>(DatException(DatErrorCode.CMS_NOT_SYNCED))

    fun getManager() = manager

    fun lastError(): DatException? = lastErrorRef.get()

    fun getVersion(): Long = version

    fun issue(plain: ByteArray, secure: ByteArray): DatResult<String> = manager.issue(plain, secure)

    fun issue(plain: String, secure: String): DatResult<String> = manager.issue(plain, secure)

    fun parse(dat: Dat): DatResult<Payload> = manager.parse(dat)

    fun parse(dat: String?): DatResult<Payload> = manager.parse(dat)

    fun parseWithoutVerifying(dat: Dat): DatResult<Payload> = manager.parseWithoutVerifying(dat)

    fun parseWithoutVerifying(dat: String?): DatResult<Payload> = manager.parseWithoutVerifying(dat)

    fun sync() {
        val error = try {
            syncOrThrow()
            null
        } catch (e: DatException) {
            e
        } catch (e: Exception) {
            DatException(DatErrorCode.CMS_UNKNOWN, "unclassified cms failure", e)
        }
        when {
            error == null -> lastErrorRef.set(null)
            error.retry == DatRetry.STATE -> Unit
            else -> {
                lastErrorRef.set(error)
                log.error("[CRITICAL] DAT CMS SYNC {}: {}", uri, error.message)
            }
        }
    }

    @Throws(DatException::class)
    fun syncOrThrow() {
        if (!lock.writeLock().tryLock()) {
            log.debug("cms sync skipped, previous sync still running: {}", uri)
            throw DatException(DatErrorCode.CMS_SYNC_IN_PROGRESS)
        }
        val newUrl = "$uri?version=$version"
        try {
            val requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(newUrl))
                .header("Authorization", token)
            requestTimeout?.let { requestBuilder.timeout(it) }
            val request = requestBuilder.build()

            val result = try {
                client.send(request, HttpResponse.BodyHandlers.ofByteArray())
            } catch (e: Exception) {
                throw DatException(DatErrorCode.CMS_UNREACHABLE, "cannot reach $uri", e)
            }

            val status = result.statusCode()
            if (status < 200 || status > 299) {
                throw httpStatusError(status)
            }

            val bytes = result.body()
            if (bytes.isEmpty() || bytes.any { (it.toInt() and 0xff) > 0x7f || it == 0.toByte() }) {
                throw DatException(DatErrorCode.CMS_MALFORMED, "response is not strict ASCII")
            }
            val body = bytes.toString(Charsets.US_ASCII)
            val iof = body.indexOf("\n")
            val versionLine = if (iof >= 0) body.substring(0, iof) else body
            if (versionLine.isEmpty() || versionLine.any { it !in '0'..'9' }) {
                throw DatException(DatErrorCode.CMS_MALFORMED, "version line is not a plain decimal integer")
            }
            val newVersion = versionLine.toLongOrNull()
                ?: throw DatException(DatErrorCode.CMS_MALFORMED, "version line is not a plain decimal integer")
            val newCertificates = if (iof >= 0) body.substring(iof + 1) else ""
            if (newCertificates.isNotEmpty()) {
                if (newVersion < version) {
                    log.warn(
                        "{}: server rolled version back {} -> {}",
                        DatErrorCode.CMS_VERSION_RESET.code, version, newVersion
                    )
                }
                val renew = try {
                    manager.imports(newCertificates, false)
                } catch (e: Exception) {
                    throw DatException(DatErrorCode.CMS_IMPORT_FAILED, "cannot apply received certificates", e)
                }
                version = newVersion
                log.debug("renew {} certificates: {}", renew, newUrl)
            } else {
                log.debug("no new certificate: {}", newUrl)
            }
        } finally {
            lock.writeLock().unlock()
        }
    }

    override fun close() {
        scheduler?.shutdownNow()
        scheduler?.awaitTermination(15, TimeUnit.SECONDS)
        lock.writeLock().lock()
        lock.writeLock().unlock()
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
        private var client: HttpClient? = null,
        private var uri: URI = URI.create("http://localhost:8088"),
        private var token: String = "",
        private var verifyOnly: Boolean = false,
        private var intervalSeconds: Long = 60L,
        private var connectTimeoutSeconds: Long = 5L,
        private var requestTimeoutSeconds: Long = 15L,
    ) {
        constructor(): this(
            client = null
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
        fun httpClient(client: HttpClient) = this.apply { this.client = client; }
        fun intervalSeconds(intervalSeconds: Long) = this.apply { this.intervalSeconds = intervalSeconds; }
        fun intervalOff() = this.apply { this.intervalSeconds = 0L; }
        fun connectTimeoutSeconds(seconds: Long) = this.apply { require(seconds >= 0); this.connectTimeoutSeconds = seconds }
        fun requestTimeoutSeconds(seconds: Long) = this.apply { require(seconds >= 0); this.requestTimeoutSeconds = seconds }

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
            val client = client ?: HttpClient.newBuilder().apply {
                if (connectTimeoutSeconds > 0) connectTimeout(Duration.ofSeconds(connectTimeoutSeconds))
                followRedirects(HttpClient.Redirect.NEVER)
            }.build()
            val timeout = requestTimeoutSeconds.takeIf { it > 0 }?.let(Duration::ofSeconds)
            val cms = DatCmsManager(uri, token, 0, manager, client, scheduler, timeout)
            scheduler?.apply {
                scheduleAtFixedRate(cms.sync, intervalSeconds, intervalSeconds, TimeUnit.SECONDS)
            }
            cms.sync()
            return cms
        }
    }
}
