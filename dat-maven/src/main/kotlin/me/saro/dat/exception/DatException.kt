package me.saro.dat.exception

class DatException @JvmOverloads constructor(
    val errorCode: DatErrorCode,
    val detail: String? = null,
    cause: Throwable? = null,
): RuntimeException(if (detail.isNullOrEmpty()) errorCode.code else "${errorCode.code}: $detail", cause) {

    val code: String get() = errorCode.code

    val retry: DatRetry get() = when (errorCode) {
        DatErrorCode.CERT_NOT_YET_ISSUABLE,
        DatErrorCode.CERT_NOT_SYNCED,
        DatErrorCode.MANAGER_NO_CERTIFICATE,
        DatErrorCode.CMS_UNREACHABLE,
        DatErrorCode.CMS_SERVER_ERROR,
        DatErrorCode.CMS_NOT_SYNCED -> DatRetry.TRANSIENT

        DatErrorCode.CMS_VERSION_RESET,
        DatErrorCode.CMS_SYNC_IN_PROGRESS -> DatRetry.STATE

        DatErrorCode.MANAGER_NO_ISSUABLE_CERTIFICATE ->
            if ((cause as? DatException)?.errorCode == DatErrorCode.CERT_NOT_YET_ISSUABLE) {
                DatRetry.TRANSIENT
            } else {
                DatRetry.PERMANENT
            }

        else -> DatRetry.PERMANENT
    }

    val securityEvent: Boolean get() =
        errorCode == DatErrorCode.SIG_MISMATCH || errorCode == DatErrorCode.CRYPTO_TAG_MISMATCH

    companion object {
        @JvmStatic
        fun codeOf(e: Throwable?): String? {
            var cursor: Throwable? = e
            while (cursor != null) {
                if (cursor is DatException) {
                    return cursor.code
                }
                cursor = cursor.cause
            }
            return null
        }
    }
}
