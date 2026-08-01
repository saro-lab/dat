import {DatManager, DatPayload, Dat} from "./index.js";
import {DatError, DatErrorCodes} from "./error.js";

/**
 * `debug` 가 빠져 있어 `this._logger.debug(...)` 가 TypeError 를 냈고, 그 예외를
 * 아래 catch 가 삼켜 **정상 동기화가 에러 로그로 기록**됐다.
 */
export type Logger = {
    debug: (...args: unknown[]) => void,
    info: (...args: unknown[]) => void,
    warn: (...args: unknown[]) => void,
    error: (...args: unknown[]) => void,
};

export class DatCmsManager {
    private uri: string;
    private token: string;
    private version: number;
    private manager: DatManager;
    private scheduler: any;
    private isSyncing: boolean = false;
    private _logger: Logger|any;
    /**
     * 마지막 동기화 실패. 한 번도 성공하지 못했으면 DAT_CMS_NOT_SYNCED, 정상이면 null.
     *
     * 최초 sync 실패를 삼키고 "인증서 0개 매니저"를 성공 반환하던 동작은 그대로 두되
     * (list.md F-3), 실패가 로그로만 남던 것을 조회 가능하게 한다.
     */
    private _lastError: DatError|null = new DatError(DatErrorCodes.CMS_NOT_SYNCED);

    private constructor(
        uri: string,
        token: string,
        version: number,
        manager: DatManager,
        scheduler: any
    ) {
        this.uri = uri;
        this.token = token;
        this.version = version;
        this.manager = manager;
        this.scheduler = scheduler;
    }

    getManager(): DatManager {
        return this.manager;
    }

    /** 마지막 동기화 실패. 재시도 여부는 `err.retry` 로 판정한다. */
    lastError(): DatError|null {
        return this._lastError;
    }

    getVersion(): number {
        return this.version;
    }

    async issue(plain: Uint8Array | string, secure: Uint8Array | string): Promise<string> {
        return this.manager.issue(plain, secure);
    }

    async parse(dat: Dat | string): Promise<DatPayload> {
        return this.manager.parse(dat);
    }

    async sync(): Promise<void> {
        try {
            await this.syncOrThrow();
            this._lastError = null;
        } catch (e) {
            const err = e instanceof DatError
                ? e : new DatError(DatErrorCodes.CMS_UNKNOWN, "unclassified cms failure", e);
            // 상태 신호는 실패로 기록하지 않는다 — 이전 동기화가 도는 중일 뿐이다.
            if (err.retry !== "state") {
                this._lastError = err;
                this._logger.error(`[CRITICAL] DAT CMS SYNC ${this.uri}`, err.code, err);
            }
        }
    }

    /**
     * 실패를 코드로 던진다. `sync()` 는 이것을 잡아 `lastError()` 에 담기만 한다 —
     * 기존 호출부가 갑자기 예외를 받지 않도록.
     */
    private async syncOrThrow(): Promise<void> {
        if (this.isSyncing) {
            this._logger.debug(`cms sync skipped, previous sync still running: ${this.uri}`);
            throw new DatError(DatErrorCodes.CMS_SYNC_IN_PROGRESS);
        }

        this.isSyncing = true;
        const newUrl = `${this.uri}?version=${this.version}`;

        try {
            let response: Response;
            try {
                response = await fetch(newUrl, {
                    headers: {
                        'Authorization': this.token
                    }
                });
            } catch (e) {
                // DNS 실패·연결 거부·TLS 실패·타임아웃이 전부 여기로 온다. 전부 일시적이다.
                throw new DatError(DatErrorCodes.CMS_UNREACHABLE, `cannot reach ${this.uri}`, e);
            }

            // HTTP 상태를 갈라 낸다. 예전에는 전부 하나의 문자열이라 401(영구)에도
            // 60초마다 영원히 재시도했다.
            if (!response.ok) {
                throw DatCmsManager.httpStatusError(response.status);
            }

            const body = await response.text();
            const iof = body.indexOf("\n");

            if (iof === 0) {
                throw new DatError(DatErrorCodes.CMS_MALFORMED, "response has no version line");
            } else if (iof > 0) {
                const versionLine = body.substring(0, iof).trim();
                if (!/^[0-9]+$/.test(versionLine)) {
                    throw new DatError(DatErrorCodes.CMS_MALFORMED, "version line is not a plain decimal integer");
                }
                const newVersion = Number(versionLine);
                if (!Number.isSafeInteger(newVersion)) {
                    throw new DatError(DatErrorCodes.CMS_MALFORMED, "version line exceeds the safe integer range");
                }
                // 서버가 우리보다 과거 버전을 돌려주면 전체 재동기화 지시다.
                if (newVersion < this.version) {
                    this._logger.warn(DatErrorCodes.CMS_VERSION_RESET, this.version, newVersion);
                }
                const newCertificates = body.substring(iof + 1).trim();
                let renew: number;
                try {
                    // 인증서 적용 실패의 원인(CERT_*/KEY_*)을 버리지 않고 체이닝한다.
                    renew = await this.manager.imports(newCertificates, false);
                } catch (e) {
                    throw new DatError(DatErrorCodes.CMS_IMPORT_FAILED, "cannot apply received certificates", e);
                }
                this.version = newVersion;
                this._logger.debug(`renew ${renew} certificates: ${newUrl}`);
            } else {
                this._logger.debug(`no new certificate: ${newUrl}`);
            }
        } finally {
            this.isSyncing = false;
        }
    }

    private static httpStatusError(status: number): DatError {
        switch (status) {
            case 401: return new DatError(DatErrorCodes.CMS_UNAUTHORIZED, "http 401");
            case 403: return new DatError(DatErrorCodes.CMS_FORBIDDEN, "http 403");
            case 404: return new DatError(DatErrorCodes.CMS_ENDPOINT_NOT_FOUND, "http 404");
        }
        if (status >= 500 && status <= 599) {
            return new DatError(DatErrorCodes.CMS_SERVER_ERROR, `http ${status}`);
        }
        return new DatError(DatErrorCodes.CMS_HTTP_STATUS, `http ${status}`);
    }

    stop(): void {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
    }

    static builder(): DatCmsManagerBuilder {
        return new DatCmsManagerBuilder();
    }
}

class DatCmsManagerBuilder {
    private _uri: URL = new URL("http://localhost:8088");
    private _token: string = "";
    private _verifyOnly: boolean = false;
    private _intervalSeconds: number = 60;
    private _logger: Logger|any = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
    };

    uri(uri: string): this {
        try {
            this._uri = new URL(uri);
        } catch (e) {
            throw new DatError(DatErrorCodes.CONFIG_URI_INVALID, "cannot be parsed as a uri", e);
        }
        if (this._uri.protocol !== 'http:' && this._uri.protocol !== 'https:') {
            throw new DatError(DatErrorCodes.CONFIG_URI_INVALID, "scheme must be http or https");
        }
        return this;
    }

    token(token: string): this {
        this._token = token;
        return this;
    }

    verifyOnly(verifyOnly: boolean): this {
        this._verifyOnly = verifyOnly;
        return this;
    }

    logger(logger: Logger|any): this {
        this._logger = logger;
        return this;
    }

    intervalSeconds(intervalSeconds: number): this {
        this._intervalSeconds = intervalSeconds;
        return this;
    }

    intervalOff(): this {
        this._intervalSeconds = 0;
        return this;
    }

    async build(): Promise<DatCmsManager> {
        if (this._uri.pathname.length > 1) {
            throw new DatError(DatErrorCodes.CONFIG_URI_INVALID, `must be path-less: ${this._uri}`);
        }
        if (this._uri.search.length > 0) {
            throw new DatError(DatErrorCodes.CONFIG_URI_INVALID, `must be query-less: ${this._uri}`);
        }

        const path = this._verifyOnly ? "/v1/certs/verify-only" : "/v1/certs";
        const uri = `${this._uri.protocol}//${this._uri.host}${path}`;

        const manager = new DatManager();
        let scheduler: any = null;

        const cms = new (DatCmsManager as any)(uri, this._token, 0, manager, null);
        cms._logger = this._logger;
        
        // Initial sync
        await cms.sync();

        if (this._intervalSeconds > 0) {
            scheduler = setInterval(() => {
                cms.sync();
            }, this._intervalSeconds * 1000);
            (cms as any).scheduler = scheduler;
        }

        return cms;
    }
}
