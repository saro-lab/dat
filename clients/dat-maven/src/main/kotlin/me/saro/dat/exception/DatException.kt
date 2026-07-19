package me.saro.dat.exception

class DatException: RuntimeException {
    constructor(message: String): super(message)

    companion object {
        val IS_NULL = DatException("is null")
        val INVALID_DAT_FORMAT = DatException("Invalid Dat Format")
        val EXPIRED_DAT = DatException("Expired Dat")
    }
}