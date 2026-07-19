package me.saro.dat.dat

import me.saro.dat.exception.DatException
import me.saro.dat.exception.DatResult
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
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

    fun getManager() = manager

    fun issue(plain: ByteArray, secure: ByteArray): DatResult<String> = manager.issue(plain, secure)

    fun issue(plain: String, secure: String): DatResult<String> = manager.issue(plain, secure)

    fun parse(dat: Dat): DatResult<Payload> = manager.parse(dat)

    fun parse(dat: String?): DatResult<Payload> = manager.parse(dat)

    fun parseWithoutVerifying(dat: Dat): DatResult<Payload> = manager.parseWithoutVerifying(dat)

    fun parseWithoutVerifying(dat: String?): DatResult<Payload> = manager.parseWithoutVerifying(dat)

    fun sync() {
        if (!lock.writeLock().tryLock()) {
            log.warn("Last request ignored (Duplicate request)")
            return
        }
        val newUrl = "$uri?version=$version"
        try {
            val request: HttpRequest = HttpRequest.newBuilder()
                .uri(URI.create(newUrl))
                .header("Authorization", token)
                .build()
            val result = client
                .send(request, HttpResponse.BodyHandlers.ofString())
            if (result.statusCode() != 200) {
                log.error("response status error, status:${result.statusCode()} in $newUrl");
            }

            val body = result.body()
            val iof = body.indexOf("\n")
            if (iof == 0) {
                log.error("invalid response: $newUrl");
            } else if (iof > 0) {
                val newVersion = body.substring(0, iof).trim().toLong()
                val newCertificates = body.substring(iof + 1).trim()
                val renew = manager.imports(newCertificates, false)
                version = newVersion
                log.debug("renew $renew certificates: $newUrl")
            } else {
                log.debug("no new certificate: $newUrl")
            }
        } catch (e: Exception) {
            log.error("[Exception] DAT SMS Sync $newUrl: $e")
        } finally {
            lock.writeLock().unlock()
        }
    }

    companion object {
        private val log: Logger = LoggerFactory.getLogger(DatCmsManager::class.java)
        private const val DAT_CMS_API_VERSION = "v1"
        @JvmStatic
        fun builder(): DatCmsManagerBuilder = DatCmsManagerBuilder()
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

        fun uri(uri: String) = this.apply { this.uri = URI.create(uri); }
        fun token(token: String) = this.apply { this.token = token; }
        fun verifyOnly(verifyOnly: Boolean) = this.apply { this.verifyOnly = verifyOnly; }
        fun intervalSeconds(intervalSeconds: Long) = this.apply { this.intervalSeconds = intervalSeconds; }
        fun intervalOff() = this.apply { this.intervalSeconds = 0L; }

        fun build(): DatCmsManager {
            if ((this.uri.path?.length?:0) > 1) {
                throw DatException("uri must be path-less: ${this.uri}")
            }
            if ((this.uri.query?.length?:0) > 0) {
                throw DatException("uri must be query-less: ${this.uri}")
            }
            val path = if (this.verifyOnly) {
                "/$DAT_CMS_API_VERSION/certs/verify-only"
            } else {
                "/$DAT_CMS_API_VERSION/certs"
            }
            val uri = "${this.uri.scheme}://${this.uri.host}:${this.uri.port}$path"

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
            cms.sync()
            return cms
        }
    }
}