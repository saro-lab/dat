namespace Saro.Dat;

/// <summary>
/// DAT 통합 오류 코드 (error.pre2.md).
///
/// 코드 문자열은 모든 공식 클라이언트와 CMS 서버가 공유하는 공개 계약이다. 메시지는 자유롭게 바꿔도 되지만
/// 코드는 바꾸지 않는다.
///
/// <list type="bullet">
/// <item>분류는 <b>원인</b>이다. "어느 함수에서 났는가"가 아니라 "무엇이 잘못됐는가"다.</item>
/// <item><c>*_UNKNOWN</c> 은 각 영역의 폴백 전용이다. "알 수 없는 X" 라는 뜻으로 쓰지 않는다.</item>
/// <item>하위 원인은 버리지 않고 <c>InnerException</c> 으로 보존한다.</item>
/// </list>
/// </summary>
public static class DatErrorCode
{
    // TOKEN : DAT 토큰 문자열
    public const string TokenMalformed = "DAT_TOKEN_MALFORMED";
    public const string TokenExpired = "DAT_TOKEN_EXPIRED";
    public const string TokenUnknown = "DAT_TOKEN_UNKNOWN";

    // CERT : 인증서
    public const string CertMalformed = "DAT_CERT_MALFORMED";
    public const string CertExpired = "DAT_CERT_EXPIRED";
    public const string CertNotYetIssuable = "DAT_CERT_NOT_YET_ISSUABLE";
    public const string CertIssuanceEnded = "DAT_CERT_ISSUANCE_ENDED";
    public const string CertVerifyOnly = "DAT_CERT_VERIFY_ONLY";
    public const string CertNotFound = "DAT_CERT_NOT_FOUND";
    public const string CertNotSynced = "DAT_CERT_NOT_SYNCED";
    public const string CertDuplicateCid = "DAT_CERT_DUPLICATE_CID";
    public const string CertUnknown = "DAT_CERT_UNKNOWN";

    // SIG : 서명
    public const string SigMismatch = "DAT_SIG_MISMATCH";
    public const string SigMalformed = "DAT_SIG_MALFORMED";
    public const string SigKeyMissing = "DAT_SIG_KEY_MISSING";
    public const string SigBackend = "DAT_SIG_BACKEND";
    public const string SigUnknown = "DAT_SIG_UNKNOWN";

    // CRYPTO : secure 페이로드
    public const string CryptoTagMismatch = "DAT_CRYPTO_TAG_MISMATCH";
    public const string CryptoDataInvalid = "DAT_CRYPTO_DATA_INVALID";
    public const string CryptoBackend = "DAT_CRYPTO_BACKEND";
    public const string CryptoUnknown = "DAT_CRYPTO_UNKNOWN";

    // KEY : 키 재료
    public const string KeyInvalid = "DAT_KEY_INVALID";
    public const string KeyVerifyOnlyUnsupported = "DAT_KEY_VERIFY_ONLY_UNSUPPORTED";
    public const string KeyUnknown = "DAT_KEY_UNKNOWN";

    // MANAGER : 매니저 보유 상태
    public const string ManagerNoCertificate = "DAT_MANAGER_NO_CERTIFICATE";
    public const string ManagerNoIssuableCertificate = "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE";
    public const string ManagerDisposed = "DAT_MANAGER_DISPOSED";
    public const string ManagerUnknown = "DAT_MANAGER_UNKNOWN";

    // CMS : 서버 응답·전송
    public const string CmsUnreachable = "DAT_CMS_UNREACHABLE";
    public const string CmsUnauthorized = "DAT_CMS_UNAUTHORIZED";
    public const string CmsForbidden = "DAT_CMS_FORBIDDEN";
    public const string CmsEndpointNotFound = "DAT_CMS_ENDPOINT_NOT_FOUND";
    public const string CmsServerError = "DAT_CMS_SERVER_ERROR";
    public const string CmsHttpStatus = "DAT_CMS_HTTP_STATUS";
    public const string CmsMalformed = "DAT_CMS_MALFORMED";
    public const string CmsImportFailed = "DAT_CMS_IMPORT_FAILED";
    public const string CmsVersionReset = "DAT_CMS_VERSION_RESET";
    public const string CmsNotSynced = "DAT_CMS_NOT_SYNCED";
    public const string CmsSyncInProgress = "DAT_CMS_SYNC_IN_PROGRESS";
    public const string CmsNotSupported = "DAT_CMS_NOT_SUPPORTED";
    public const string CmsUnknown = "DAT_CMS_UNKNOWN";

    // CONFIG : 호출자가 넘긴 값
    public const string ConfigAlgUnsupported = "DAT_CONFIG_ALG_UNSUPPORTED";
    public const string ConfigUriInvalid = "DAT_CONFIG_URI_INVALID";
    public const string ConfigArgumentInvalid = "DAT_CONFIG_ARGUMENT_INVALID";
    public const string ConfigUnknown = "DAT_CONFIG_UNKNOWN";

    // INTERNAL : 실행 환경
    public const string InternalUnavailable = "DAT_INTERNAL_UNAVAILABLE";
    public const string InternalUnknown = "DAT_INTERNAL_UNKNOWN";
}

/// <summary>
/// 재시도 분류. 중간값을 두지 않는다 — 호출부가 분기할 수 없기 때문이다.
/// </summary>
public enum DatRetry
{
    /// <summary>설정·입력·배포를 고쳐야 한다. 재시도하지 않는다.</summary>
    Permanent,

    /// <summary>같은 입력으로 재시도하면 해소될 수 있다. 백오프 후 재시도한다.</summary>
    Transient,

    /// <summary>오류가 아닌 상태 신호. 흐름 제어에만 쓴다.</summary>
    State
}

public class DatException : Exception
{
    /// <summary>공개 계약인 오류 코드. 모든 공식 클라이언트에서 동일하다.</summary>
    public string Code { get; }

    /// <summary>사람이 읽는 설명. 자유롭게 바꿔도 된다.</summary>
    public string? Detail { get; }

    /// <summary>
    /// 예전에는 <c>(string message)</c> 생성자 하나뿐이라 하위 원인을 실을 수 없었다.
    /// innerException 자리가 이 체계의 선결 조건이다 — 원인 체이닝을 버리지 않는다.
    /// </summary>
    public DatException(string code, string? detail = null, Exception? innerException = null)
        : base(detail is null ? code : $"{code}: {detail}", innerException)
    {
        Code = code;
        Detail = detail;
    }

    /// <summary>
    /// 재시도 분류. 애매하면 Permanent 다 — 영구 오류에 대한 무한 재시도가
    /// 이 체계 이전의 실제 결함이었다.
    /// </summary>
    public DatRetry Retry
    {
        get
        {
            if (Code == DatErrorCode.ManagerNoIssuableCertificate)
            {
                // 발급창 시작 전이면 기다리면 풀린다. 나머지 사유는 안 풀린다.
                return InnerException is DatException { Code: DatErrorCode.CertNotYetIssuable }
                    ? DatRetry.Transient
                    : DatRetry.Permanent;
            }

            return Code switch
            {
                DatErrorCode.CertNotYetIssuable or DatErrorCode.CertNotSynced
                    or DatErrorCode.ManagerNoCertificate or DatErrorCode.CmsUnreachable
                    or DatErrorCode.CmsServerError or DatErrorCode.CmsNotSynced => DatRetry.Transient,
                DatErrorCode.CmsVersionReset or DatErrorCode.CmsSyncInProgress => DatRetry.State,
                _ => DatRetry.Permanent
            };
        }
    }

    /// <summary>
    /// 위조·변조 시도의 직접 증거. 다른 실패와 같은 경로로 로깅하지 않는다.
    /// </summary>
    public bool SecurityEvent =>
        Code is DatErrorCode.SigMismatch or DatErrorCode.CryptoTagMismatch;

    /// <summary>어떤 예외에서든 DAT 오류 코드를 꺼낸다. DAT 오류가 아니면 null 이다.</summary>
    public static string? CodeOf(Exception? e) => (e as DatException)?.Code;
}
