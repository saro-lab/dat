package test.kt

import me.saro.dat.dat.DatManager
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * Parses interop vectors produced by dat-rust (the reference implementation).
 * Vector file path comes from the DAT_INTEROP_VECTORS env var; skipped when absent.
 */
class InteropVectorTest {
    @Test
    fun parseRustVectors() {
        val path = System.getenv("DAT_INTEROP_VECTORS")
        assumeTrue(path != null && File(path).isFile, "DAT_INTEROP_VECTORS not set")

        var certFormat: String? = null
        var manager = DatManager.newInstance()
        var checked = 0

        File(path!!).readLines().filter { it.isNotBlank() }.forEach { line ->
            val (tag, value) = line.split("\t", limit = 2)
            when (tag) {
                "CERT" -> {
                    certFormat = value
                    manager = DatManager.newInstance()
                    manager.imports(value, true)
                }
                else -> {
                    require(certFormat != null) { "vector file must start with CERT" }
                    val payload = manager.parse(value).getOrThrow()
                    when (tag) {
                        "DAT_EMPTY_SECURE" -> {
                            assertEquals("hello", payload.plain)
                            assertEquals("", payload.secure)
                        }
                        "DAT_EMPTY_BOTH" -> {
                            assertEquals("", payload.plain)
                            assertEquals("", payload.secure)
                        }
                        "DAT_NORMAL" -> {
                            assertEquals("hello", payload.plain)
                            assertEquals("world", payload.secure)
                        }
                    }
                    checked++
                }
            }
        }
        assumeTrue(checked > 0, "no dat vectors found")
        println("interop: parsed $checked rust-issued DATs")
    }
}
