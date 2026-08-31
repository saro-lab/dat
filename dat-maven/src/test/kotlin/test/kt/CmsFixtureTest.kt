package test.kt

import com.sun.net.httpserver.HttpServer
import me.saro.dat.dat.DatCmsManager
import me.saro.dat.exception.DatException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.nio.file.Files
import java.nio.file.Paths
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

class CmsFixtureTest {
    @Test
    fun ownedClientBlocksRedirectAndHonorsTimeoutOption() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val requests = AtomicInteger(0)
        server.createContext("/") { exchange ->
            requests.incrementAndGet()
            exchange.responseHeaders.add("Location", "http://127.0.0.1:${server.address.port}/other")
            exchange.sendResponseHeaders(302, -1)
            exchange.close()
        }
        server.start()
        try {
            DatCmsManager.builder().uri("http://127.0.0.1:${server.address.port}").intervalOff().build().use { cms ->
                assertEquals("DAT_CMS_HTTP_STATUS", cms.lastError()?.code)
                assertEquals(1, requests.get())
            }
        } finally { server.stop(0) }
    }

    @Test
    fun closeWaitsForBoundedInFlightSync() {
        val block = AtomicReference(false)
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            if (block.get()) Thread.sleep(5_000)
            val body = ascii("0")
            exchange.sendResponseHeaders(200, body.size.toLong())
            exchange.responseBody.use { it.write(body) }
        }
        server.start()
        try {
            val cms = DatCmsManager.builder().uri("http://127.0.0.1:${server.address.port}")
                .intervalOff().requestTimeoutSeconds(1).build()
            block.set(true)
            val sync = thread { runCatching { cms.syncOrThrow() } }
            Thread.sleep(50)
            val started = System.nanoTime()
            cms.close()
            sync.join(1_500)
            assertTrue(!sync.isAlive)
            assertTrue((System.nanoTime() - started) < 3_000_000_000L)
        } finally { server.stop(0) }
    }

    @Test
    fun stateTransitionsFollowSignedI64Fixture() {
        val root = Json(Files.readString(Paths.get(javaClass.getResource("/cms_v1_state_transitions.json")!!.toURI()))).value() as Map<String, Any?>
        val certificates = (root["certificates"] as Map<String, Map<String, Any?>>).mapValues { it.value["wire_ascii"] as String }
        val states = root["states"] as Map<String, Map<String, Any?>>
        val response = AtomicReference(Pair(200, ascii("0")))
        val connections = AtomicInteger(0)
        val drop = AtomicReference(false)
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            connections.incrementAndGet()
            if (drop.get()) { exchange.close(); return@createContext }
            val (status, body) = response.get()
            exchange.sendResponseHeaders(status, body.size.toLong())
            exchange.responseBody.use { it.write(body) }
        }
        server.start()
        try {
            for (case in root["cases"] as List<Map<String, Any?>>) {
                val id = case["id"] as String
                val initial = states[case["initial"] as String]!!
                drop.set(false)
                response.set(Pair(200, stateBody(initial, certificates)))
                val cms = DatCmsManager.builder().uri("http://127.0.0.1:${server.address.port}").intervalOff().build()
                val input = case["input"] as Map<String, Any?>
                if (input["kind"] == "transport") {
                    drop.set(true)
                } else {
                    drop.set(false)
                    response.set(Pair((input["status"] as Number).toInt(), assemble(input["body"] as List<List<String>>, certificates)))
                }
                val expected = (case["expect"] ?: (case["expect_by_profile"] as Map<String, Any?>)["signed_i64"]) as Map<String, Any?>
                val failure = try { cms.syncOrThrow(); null } catch (e: DatException) { e }
                val expectedError = expected["error"] as String?
                if (expectedError == null) assertNull(failure, id) else {
                    assertEquals(expectedError.substringBefore('('), failure?.code, id)
                    assertEquals(expected["retry"], failure?.retry?.name?.lowercase(), id)
                }
                val state = states[expected["state"] as String]!!
                assertEquals((state["version"] as String).toLong(), cms.getVersion(), id)
                assertEquals((state["certificates"] as List<String>).map { certificates[it]!!.substringBefore('.').toLong(16) }, cms.getManager().exportsIds(), id)
                assertEquals(state["issuer"] != null, cms.issue("fixture", "fixture").isSuccess, id)
                cms.close()
            }
        } finally {
            server.stop(0)
        }
    }

    private fun stateBody(state: Map<String, Any?>, certificates: Map<String, String>): ByteArray {
        val version = state["version"] as String
        val certs = (state["certificates"] as List<String>).joinToString("\n") { certificates[it]!! }
        return ascii(if (certs.isEmpty()) version else "$version\n$certs")
    }

    private fun assemble(segments: List<List<String>>, certificates: Map<String, String>): ByteArray =
        segments.flatMap { (kind, value) -> when (kind) {
            "ascii" -> ascii(value).asIterable()
            "certificate" -> ascii(certificates[value]!!).asIterable()
            "hex" -> value.chunked(2).map { it.toInt(16).toByte() }
            else -> error(kind)
        } }.toByteArray()

    private fun ascii(value: String) = value.toByteArray(Charsets.US_ASCII)

    private class Json(private val text: String) {
        private var i = 0
        fun value(): Any? = when (val c = next()) {
            '{' -> objectValue(); '[' -> arrayValue(); '"' -> string(); 'n' -> { word("ull"); null }
            't' -> { word("rue"); true }; 'f' -> { word("alse"); false }; else -> number(c)
        }
        private fun objectValue(): Map<String, Any?> {
            val out = linkedMapOf<String, Any?>(); skip(); if (peek() == '}') { i++; return out }
            while (true) { require(next() == '"'); val key = string(); skip(); require(next() == ':'); skip(); out[key] = value(); skip(); if (next() == '}') return out; skip() }
        }
        private fun arrayValue(): List<Any?> {
            val out = mutableListOf<Any?>(); skip(); if (peek() == ']') { i++; return out }
            while (true) { out += value(); skip(); if (next() == ']') return out; skip() }
        }
        private fun string(): String {
            val out = StringBuilder(); while (true) when (val c = text[i++]) { '"' -> return out.toString(); '\\' -> when (val e = text[i++]) {
                '"', '\\', '/' -> out.append(e); 'b' -> out.append('\b'); 'f' -> out.append('\u000c'); 'n' -> out.append('\n'); 'r' -> out.append('\r'); 't' -> out.append('\t'); 'u' -> out.append(text.substring(i, i + 4).toInt(16).toChar()).also { i += 4 }; else -> error(e)
            }; else -> out.append(c) }
        }
        private fun number(first: Char): Number { val start = i - 1; while (i < text.length && text[i] in "0123456789+-.eE") i++; return text.substring(start, i).toLongOrNull() ?: text.substring(start, i).toDouble() }
        private fun word(rest: String) { require(text.regionMatches(i, rest, 0, rest.length)); i += rest.length }
        private fun next(): Char { skip(); return text[i++] }
        private fun peek(): Char { skip(); return text[i] }
        private fun skip() { while (i < text.length && text[i].isWhitespace()) i++ }
    }
}
