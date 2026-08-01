package me.saro.dat.exception

/**
 * DAT 의 단일 오류 타입.
 *
 * 예전에는 `DatException(message)` 생성자 하나뿐이라 **하위 원인을 실을 수 없었다.**
 * 인증서 파싱 도중 난 키 오류가 `"Invalid Dat Certificate Format"` 문자열로 덮여
 * 사라지던 것이 그 결과다. 이제 [cause] 로 체이닝을 보존한다.
 *
 * 예외 싱글턴(`IS_NULL`/`INVALID_DAT_FORMAT`/`EXPIRED_DAT`)도 함께 없앴다. 싱글턴은
 * 스택 트레이스가 클래스 초기화 시점을 가리키고 컨텍스트를 실을 수 없어 코드 체계와
 * 양립하지 않는다.
 */
class DatException @JvmOverloads constructor(
    /** 공개 계약인 오류 코드. 모든 공식 클라이언트에서 동일하다. */
    val errorCode: DatErrorCode,
    /** 사람이 읽는 설명. 자유롭게 바꿔도 된다. */
    val detail: String? = null,
    cause: Throwable? = null,
): RuntimeException(if (detail.isNullOrEmpty()) errorCode.code else "${errorCode.code}: $detail", cause) {

    /** 공개 계약인 오류 코드 문자열. */
    val code: String get() = errorCode.code

    /**
     * 재시도 분류. 애매하면 [DatRetry.PERMANENT] 다 — 영구 오류에 대한 무한 재시도가
     * 이 체계 이전의 실제 결함이었다.
     */
    val retry: DatRetry get() = when (errorCode) {
        DatErrorCode.CERT_NOT_YET_ISSUABLE,
        DatErrorCode.CERT_NOT_SYNCED,
        DatErrorCode.MANAGER_NO_CERTIFICATE,
        DatErrorCode.CMS_UNREACHABLE,
        DatErrorCode.CMS_SERVER_ERROR,
        DatErrorCode.CMS_NOT_SYNCED -> DatRetry.TRANSIENT

        DatErrorCode.CMS_VERSION_RESET,
        DatErrorCode.CMS_SYNC_IN_PROGRESS -> DatRetry.STATE

        // 발급창 시작 전이면 기다리면 풀린다. 나머지 사유는 안 풀린다.
        DatErrorCode.MANAGER_NO_ISSUABLE_CERTIFICATE ->
            if ((cause as? DatException)?.errorCode == DatErrorCode.CERT_NOT_YET_ISSUABLE) {
                DatRetry.TRANSIENT
            } else {
                DatRetry.PERMANENT
            }

        else -> DatRetry.PERMANENT
    }

    /** 위조·변조 시도의 직접 증거. 다른 실패와 같은 경로로 로깅하지 않는다. */
    val securityEvent: Boolean get() =
        errorCode == DatErrorCode.SIG_MISMATCH || errorCode == DatErrorCode.CRYPTO_TAG_MISMATCH

    companion object {
        /**
         * 어떤 예외에서든 DAT 오류 코드를 꺼낸다. DAT 오류가 아니면 null 이다.
         * 원인 체인을 따라 내려가며 찾는다.
         */
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
