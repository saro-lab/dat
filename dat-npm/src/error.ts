/**
 * DAT 통합 오류 코드 (error.pre2.md).
 *
 * 코드 문자열은 모든 공식 클라이언트와 CMS 서버가 공유하는 공개 계약이다. message 는 자유롭게 바꿔도 되지만
 * `code` 는 바꾸지 않는다.
 *
 * - 분류는 **원인**이다. "어느 함수에서 났는가"가 아니라 "무엇이 잘못됐는가"다.
 * - `*_UNKNOWN` 은 각 영역의 폴백 전용이다. "알 수 없는 X" 라는 뜻으로 쓰지 않는다.
 * - 하위 원인은 버리지 않고 `cause` 로 보존한다.
 */
export const DatErrorCodes = {
    // TOKEN : DAT 토큰 문자열
    TOKEN_MALFORMED: "DAT_TOKEN_MALFORMED",
    TOKEN_EXPIRED: "DAT_TOKEN_EXPIRED",
    TOKEN_UNKNOWN: "DAT_TOKEN_UNKNOWN",

    // CERT : 인증서
    CERT_MALFORMED: "DAT_CERT_MALFORMED",
    CERT_EXPIRED: "DAT_CERT_EXPIRED",
    CERT_NOT_YET_ISSUABLE: "DAT_CERT_NOT_YET_ISSUABLE",
    CERT_ISSUANCE_ENDED: "DAT_CERT_ISSUANCE_ENDED",
    CERT_VERIFY_ONLY: "DAT_CERT_VERIFY_ONLY",
    CERT_NOT_FOUND: "DAT_CERT_NOT_FOUND",
    CERT_NOT_SYNCED: "DAT_CERT_NOT_SYNCED",
    CERT_DUPLICATE_CID: "DAT_CERT_DUPLICATE_CID",
    CERT_UNKNOWN: "DAT_CERT_UNKNOWN",

    // SIG : 서명
    SIG_MISMATCH: "DAT_SIG_MISMATCH",
    SIG_MALFORMED: "DAT_SIG_MALFORMED",
    SIG_KEY_MISSING: "DAT_SIG_KEY_MISSING",
    SIG_BACKEND: "DAT_SIG_BACKEND",
    SIG_UNKNOWN: "DAT_SIG_UNKNOWN",

    // CRYPTO : secure 페이로드
    CRYPTO_TAG_MISMATCH: "DAT_CRYPTO_TAG_MISMATCH",
    CRYPTO_DATA_INVALID: "DAT_CRYPTO_DATA_INVALID",
    CRYPTO_BACKEND: "DAT_CRYPTO_BACKEND",
    CRYPTO_UNKNOWN: "DAT_CRYPTO_UNKNOWN",

    // KEY : 키 재료
    KEY_INVALID: "DAT_KEY_INVALID",
    KEY_VERIFY_ONLY_UNSUPPORTED: "DAT_KEY_VERIFY_ONLY_UNSUPPORTED",
    KEY_UNKNOWN: "DAT_KEY_UNKNOWN",

    // MANAGER : 매니저 보유 상태
    MANAGER_NO_CERTIFICATE: "DAT_MANAGER_NO_CERTIFICATE",
    MANAGER_NO_ISSUABLE_CERTIFICATE: "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE",
    MANAGER_DISPOSED: "DAT_MANAGER_DISPOSED",
    MANAGER_UNKNOWN: "DAT_MANAGER_UNKNOWN",

    // CMS : 서버 응답·전송
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

    // CONFIG : 호출자가 넘긴 값
    CONFIG_ALG_UNSUPPORTED: "DAT_CONFIG_ALG_UNSUPPORTED",
    CONFIG_URI_INVALID: "DAT_CONFIG_URI_INVALID",
    CONFIG_ARGUMENT_INVALID: "DAT_CONFIG_ARGUMENT_INVALID",
    CONFIG_UNKNOWN: "DAT_CONFIG_UNKNOWN",

    // INTERNAL : 실행 환경
    INTERNAL_UNAVAILABLE: "DAT_INTERNAL_UNAVAILABLE",
    INTERNAL_UNKNOWN: "DAT_INTERNAL_UNKNOWN",
} as const;

export type DatErrorCode = typeof DatErrorCodes[keyof typeof DatErrorCodes];

/** 재시도 분류. 중간값을 두지 않는다 — 호출부가 분기할 수 없기 때문이다. */
export type DatRetry =
    /** 같은 입력으로 재시도하면 해소될 수 있다. 백오프 후 재시도한다. */
    | "transient"
    /** 설정·입력·배포를 고쳐야 한다. 재시도하지 않는다. */
    | "permanent"
    /** 오류가 아닌 상태 신호. 흐름 제어에만 쓴다. */
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
    /** 공개 계약인 오류 코드. 모든 공식 클라이언트에서 동일하다. */
    public readonly code: DatErrorCode;
    /** 하위 원인. 체이닝을 버리지 않는다. */
    public override readonly cause?: unknown;

    constructor(code: DatErrorCode, detail?: string, cause?: unknown) {
        super(detail ? `${code}: ${detail}` : code);
        this.name = "DatError";
        this.code = code;
        this.cause = cause;
        // ES5 타깃으로 내려갈 때 instanceof 가 깨지지 않게 한다.
        Object.setPrototypeOf(this, DatError.prototype);
    }

    /**
     * 재시도 분류. 애매하면 permanent 다 — 영구 오류에 대한 무한 재시도가
     * 이 체계 이전의 실제 결함이었다.
     */
    get retry(): DatRetry {
        if (this.code === DatErrorCodes.MANAGER_NO_ISSUABLE_CERTIFICATE) {
            // 발급창 시작 전이면 기다리면 풀린다. 나머지 사유는 안 풀린다.
            return (this.cause as DatError | undefined)?.code === DatErrorCodes.CERT_NOT_YET_ISSUABLE
                ? "transient" : "permanent";
        }
        if (TRANSIENT.has(this.code)) return "transient";
        if (STATE.has(this.code)) return "state";
        return "permanent";
    }

    /** 위조·변조 시도의 직접 증거. 다른 실패와 같은 경로로 로깅하지 않는다. */
    get securityEvent(): boolean {
        return this.code === DatErrorCodes.SIG_MISMATCH
            || this.code === DatErrorCodes.CRYPTO_TAG_MISMATCH;
    }

    /** 어떤 값에서든 DAT 오류 코드를 꺼낸다. DAT 오류가 아니면 undefined 다. */
    static codeOf(e: unknown): DatErrorCode | undefined {
        return e instanceof DatError ? e.code : undefined;
    }

    /**
     * DAT 오류가 아닌 것을 감싼다. 이미 DatError 면 그대로 둔다.
     * 원본은 `cause` 로 반드시 보존한다.
     */
    static wrap(code: DatErrorCode, detail: string, e: unknown): DatError {
        if (e instanceof DatError) {
            return e;
        }
        return new DatError(code, detail, e);
    }
}
