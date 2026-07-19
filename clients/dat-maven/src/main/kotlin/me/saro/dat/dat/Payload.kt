package me.saro.dat.dat

import me.saro.dat.DatUtils

class Payload(
    val plainBytes: ByteArray,
    val secureBytes: ByteArray,
) {
    val plain: String get() = String(plainBytes, Charsets.UTF_8)
    val secure: String get() = String(secureBytes, Charsets.UTF_8)

    override fun toString(): String {
        return "${DatUtils.encodeBase64Url(plainBytes)} ${DatUtils.encodeBase64Url(secureBytes)}"
    }

    fun toUnsafeString(): String {
        return "$plain $secure"
    }
}
