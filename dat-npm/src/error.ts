export const DatErrorCodes = {
    TOKEN_MALFORMED: "DAT_TOKEN_MALFORMED",
    TOKEN_EXPIRED: "DAT_TOKEN_EXPIRED",
    TOKEN_UNKNOWN: "DAT_TOKEN_UNKNOWN",

    CERT_MALFORMED: "DAT_CERT_MALFORMED",
    CERT_EXPIRED: "DAT_CERT_EXPIRED",
    CERT_NOT_YET_ISSUABLE: "DAT_CERT_NOT_YET_ISSUABLE",
    CERT_ISSUANCE_ENDED: "DAT_CERT_ISSUANCE_ENDED",
    CERT_VERIFY_ONLY: "DAT_CERT_VERIFY_ONLY",
    CERT_NOT_FOUND: "DAT_CERT_NOT_FOUND",
    CERT_NOT_SYNCED: "DAT_CERT_NOT_SYNCED",
    CERT_DUPLICATE_CID: "DAT_CERT_DUPLICATE_CID",
    CERT_UNKNOWN: "DAT_CERT_UNKNOWN",

    SIG_MISMATCH: "DAT_SIG_MISMATCH",
    SIG_MALFORMED: "DAT_SIG_MALFORMED",
    SIG_KEY_MISSING: "DAT_SIG_KEY_MISSING",
    SIG_BACKEND: "DAT_SIG_BACKEND",
    SIG_UNKNOWN: "DAT_SIG_UNKNOWN",

    CRYPTO_TAG_MISMATCH: "DAT_CRYPTO_TAG_MISMATCH",
    CRYPTO_DATA_INVALID: "DAT_CRYPTO_DATA_INVALID",
    CRYPTO_BACKEND: "DAT_CRYPTO_BACKEND",
    CRYPTO_UNKNOWN: "DAT_CRYPTO_UNKNOWN",

    KEY_INVALID: "DAT_KEY_INVALID",
    KEY_VERIFY_ONLY_UNSUPPORTED: "DAT_KEY_VERIFY_ONLY_UNSUPPORTED",
    KEY_UNKNOWN: "DAT_KEY_UNKNOWN",

    MANAGER_NO_CERTIFICATE: "DAT_MANAGER_NO_CERTIFICATE",
    MANAGER_NO_ISSUABLE_CERTIFICATE: "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE",
    MANAGER_DISPOSED: "DAT_MANAGER_DISPOSED",
    MANAGER_UNKNOWN: "DAT_MANAGER_UNKNOWN",

    CMS_UNREACHABLE: "DAT_CMS_UNREACHABLE",
    CMS_UNAUTHORIZED: "DAT_CMS_UNAUTHORIZED",
    CMS_FORBIDDEN: "DAT_CMS_FORBIDDEN",
    CMS_ENDPOINT_NOT_FOUND: "DAT_CMS_ENDPOINT_NOT_FOUND",
    CMS_SERVER_ERROR: "DAT_CMS_SERVER_ERROR",
    CMS_HTTP_STATUS: "DAT_CMS_HTTP_STATUS",
    CMS_MALFORMED: "DAT_CMS_MALFORMED",
    CMS_IMPORT_FAILED: "DAT_CMS_IMPORT_FAILED",
    CMS_VERSION_RESET: "DAT_CMS_VERSION_RESET",
    CMS_NOT_SYNCED: "DAT_CMS_NOT_SYNCED",
    CMS_SYNC_IN_PROGRESS: "DAT_CMS_SYNC_IN_PROGRESS",
    CMS_NOT_SUPPORTED: "DAT_CMS_NOT_SUPPORTED",
    CMS_UNKNOWN: "DAT_CMS_UNKNOWN",

    CONFIG_ALG_UNSUPPORTED: "DAT_CONFIG_ALG_UNSUPPORTED",
    CONFIG_URI_INVALID: "DAT_CONFIG_URI_INVALID",
    CONFIG_ARGUMENT_INVALID: "DAT_CONFIG_ARGUMENT_INVALID",
    CONFIG_UNKNOWN: "DAT_CONFIG_UNKNOWN",

    INTERNAL_UNAVAILABLE: "DAT_INTERNAL_UNAVAILABLE",
    INTERNAL_UNKNOWN: "DAT_INTERNAL_UNKNOWN",
} as const;

export type DatErrorCode = typeof DatErrorCodes[keyof typeof DatErrorCodes];

export type DatRetry =
    | "transient"
    | "permanent"
    | "state";

const TRANSIENT: ReadonlySet<string> = new Set<string>([
    DatErrorCodes.CERT_NOT_YET_ISSUABLE,
    DatErrorCodes.CERT_NOT_SYNCED,
    DatErrorCodes.MANAGER_NO_CERTIFICATE,
    DatErrorCodes.CMS_UNREACHABLE,
    DatErrorCodes.CMS_SERVER_ERROR,
    DatErrorCodes.CMS_NOT_SYNCED,
]);

const STATE: ReadonlySet<string> = new Set<string>([
    DatErrorCodes.CMS_VERSION_RESET,
    DatErrorCodes.CMS_SYNC_IN_PROGRESS,
]);

export class DatError extends Error {
    public readonly code: DatErrorCode;
    public override readonly cause?: unknown;

    constructor(code: DatErrorCode, detail?: string, cause?: unknown) {
        super(detail ? `${code}: ${detail}` : code);
        this.name = "DatError";
        this.code = code;
        this.cause = cause;
        Object.setPrototypeOf(this, DatError.prototype);
    }

    get retry(): DatRetry {
        if (this.code === DatErrorCodes.MANAGER_NO_ISSUABLE_CERTIFICATE) {
            return (this.cause as DatError | undefined)?.code === DatErrorCodes.CERT_NOT_YET_ISSUABLE
                ? "transient" : "permanent";
        }
        if (TRANSIENT.has(this.code)) return "transient";
        if (STATE.has(this.code)) return "state";
        return "permanent";
    }

    get securityEvent(): boolean {
        return this.code === DatErrorCodes.SIG_MISMATCH
            || this.code === DatErrorCodes.CRYPTO_TAG_MISMATCH;
    }

    static codeOf(e: unknown): DatErrorCode | undefined {
        return e instanceof DatError ? e.code : undefined;
    }

    static wrap(code: DatErrorCode, detail: string, e: unknown): DatError {
        if (e instanceof DatError) {
            return e;
        }
        return new DatError(code, detail, e);
    }
}
