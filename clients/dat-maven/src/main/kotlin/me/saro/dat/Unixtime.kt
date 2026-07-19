package me.saro.dat

class Unixtime {
    companion object {
        @JvmStatic
        fun now(): Long {
            return System.currentTimeMillis() / 1000L
        }
    }
}