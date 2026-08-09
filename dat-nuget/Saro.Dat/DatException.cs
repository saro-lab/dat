namespace Saro.Dat;

public static class DatErrorCode
{
    public const string TokenMalformed = "DAT_TOKEN_MALFORMED";
    public const string TokenExpired = "DAT_TOKEN_EXPIRED";
    public const string TokenUnknown = "DAT_TOKEN_UNKNOWN";

    public const string CertMalformed = "DAT_CERT_MALFORMED";
    public const string CertExpired = "DAT_CERT_EXPIRED";
    public const string CertNotYetIssuable = "DAT_CERT_NOT_YET_ISSUABLE";
    public const string CertIssuanceEnded = "DAT_CERT_ISSUANCE_ENDED";
    public const string CertVerifyOnly = "DAT_CERT_VERIFY_ONLY";
    public const string CertNotFound = "DAT_CERT_NOT_FOUND";
    public const string CertNotSynced = "DAT_CERT_NOT_SYNCED";
    public const string CertDuplicateCid = "DAT_CERT_DUPLICATE_CID";
    public const string CertUnknown = "DAT_CERT_UNKNOWN";

    public const string SigMismatch = "DAT_SIG_MISMATCH";
    public const string SigMalformed = "DAT_SIG_MALFORMED";
    public const string SigKeyMissing = "DAT_SIG_KEY_MISSING";
    public const string SigBackend = "DAT_SIG_BACKEND";
    public const string SigUnknown = "DAT_SIG_UNKNOWN";

    public const string CryptoTagMismatch = "DAT_CRYPTO_TAG_MISMATCH";
    public const string CryptoDataInvalid = "DAT_CRYPTO_DATA_INVALID";
    public const string CryptoBackend = "DAT_CRYPTO_BACKEND";
    public const string CryptoUnknown = "DAT_CRYPTO_UNKNOWN";

    public const string KeyInvalid = "DAT_KEY_INVALID";
    public const string KeyVerifyOnlyUnsupported = "DAT_KEY_VERIFY_ONLY_UNSUPPORTED";
    public const string KeyUnknown = "DAT_KEY_UNKNOWN";

    public const string ManagerNoCertificate = "DAT_MANAGER_NO_CERTIFICATE";
    public const string ManagerNoIssuableCertificate = "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE";
    public const string ManagerDisposed = "DAT_MANAGER_DISPOSED";
    public const string ManagerUnknown = "DAT_MANAGER_UNKNOWN";

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

    public const string ConfigAlgUnsupported = "DAT_CONFIG_ALG_UNSUPPORTED";
    public const string ConfigUriInvalid = "DAT_CONFIG_URI_INVALID";
    public const string ConfigArgumentInvalid = "DAT_CONFIG_ARGUMENT_INVALID";
    public const string ConfigUnknown = "DAT_CONFIG_UNKNOWN";

    public const string InternalUnavailable = "DAT_INTERNAL_UNAVAILABLE";
    public const string InternalUnknown = "DAT_INTERNAL_UNKNOWN";
}

public enum DatRetry
{
    Permanent,

    Transient,

    State
}

public class DatException : Exception
{
    public string Code { get; }

    public string? Detail { get; }

    public DatException(string code, string? detail = null, Exception? innerException = null)
        : base(detail is null ? code : $"{code}: {detail}", innerException)
    {
        Code = code;
        Detail = detail;
    }

    public DatRetry Retry
    {
        get
        {
            if (Code == DatErrorCode.ManagerNoIssuableCertificate)
            {
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

    public bool SecurityEvent =>
        Code is DatErrorCode.SigMismatch or DatErrorCode.CryptoTagMismatch;

    public static string? CodeOf(Exception? e) => (e as DatException)?.Code;
}
