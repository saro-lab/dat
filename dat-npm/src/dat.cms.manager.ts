import {DatManager, DatPayload, Dat} from "./index.js";
import {DatError, DatErrorCodes} from "./error.js";

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
    private activeController: AbortController|null = null;
    private stopped: boolean = false;
    private connectTimeoutMs: number;
    private syncTimeoutMs: number;
    private isSyncing: boolean = false;
    private _logger: Logger|any;
    private _lastError: DatError|null = new DatError(DatErrorCodes.CMS_NOT_SYNCED);

    private constructor(
        uri: string,
        token: string,
        version: number,
        manager: DatManager,
        scheduler: any,
        connectTimeoutMs: number,
        syncTimeoutMs: number,
    ) {
        this.uri = uri;
        this.token = token;
        this.version = version;
        this.manager = manager;
        this.scheduler = scheduler;
        this.connectTimeoutMs = connectTimeoutMs;
        this.syncTimeoutMs = syncTimeoutMs;
    }

    getManager(): DatManager {
        return this.manager;
    }

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
            if (err.retry !== "state") {
                this._lastError = err;
                this._logger.error(`[CRITICAL] DAT CMS SYNC ${this.uri}`, err.code, err);
            }
        }
    }

    async syncOrThrow(): Promise<void> {
        if (this.isSyncing) {
            this._logger.debug(`cms sync skipped, previous sync still running: ${this.uri}`);
            throw new DatError(DatErrorCodes.CMS_SYNC_IN_PROGRESS);
        }

        this.isSyncing = true;
        const newUrl = `${this.uri}?version=${this.version}`;
        let controller: AbortController|null = null;
        let totalTimer: ReturnType<typeof setTimeout>|null = null;
        let connectTimer: ReturnType<typeof setTimeout>|null = null;

        try {
            controller = new AbortController();
            this.activeController = controller;
            totalTimer = this.syncTimeoutMs > 0 ? setTimeout(() => controller!.abort(), this.syncTimeoutMs) : null;
            connectTimer = this.connectTimeoutMs > 0 ? setTimeout(() => controller!.abort(), this.connectTimeoutMs) : null;
            let response: Response;
            try {
                response = await fetch(newUrl, {
                    headers: {
                        'Authorization': this.token
                    },
                    redirect: "manual",
                    signal: controller.signal,
                });
                if (connectTimer) clearTimeout(connectTimer);
            } catch (e) {
                throw new DatError(DatErrorCodes.CMS_UNREACHABLE, `cannot reach ${this.uri}`, e);
            }

            if (!response.ok) {
                throw DatCmsManager.httpStatusError(response.status);
            }

            let bytes: Uint8Array;
            try {
                bytes = new Uint8Array(await response.arrayBuffer());
            } catch (e) {
                throw new DatError(DatErrorCodes.CMS_UNREACHABLE, `cannot read ${this.uri}`, e);
            }
            if (bytes.some(byte => byte > 0x7f)) {
                throw new DatError(DatErrorCodes.CMS_MALFORMED, "response is not strict ASCII");
            }
            const body = new TextDecoder("ascii", {fatal: true}).decode(bytes);
            if (body.length === 0) {
                throw new DatError(DatErrorCodes.CMS_MALFORMED, "response is empty");
            }
            const iof = body.indexOf("\n");
            const versionLine = iof < 0 ? body : body.substring(0, iof);
            if (versionLine.length === 0) {
                throw new DatError(DatErrorCodes.CMS_MALFORMED, "response has no version line");
            }
            if (!/^[0-9]+$/.test(versionLine)) {
                throw new DatError(DatErrorCodes.CMS_MALFORMED, "version line is not a plain decimal integer");
            }
            const newVersion = Number(versionLine);
            if (!Number.isSafeInteger(newVersion)) {
                throw new DatError(DatErrorCodes.CMS_MALFORMED, "version line exceeds the safe integer range");
            }
            const newCertificates = iof < 0 ? "" : body.substring(iof + 1).trim();
            if (newCertificates.length > 0) {
                if (newVersion < this.version) {
                    this._logger.warn(DatErrorCodes.CMS_VERSION_RESET, this.version, newVersion);
                }
                let renew: number;
                try {
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
            if (totalTimer) clearTimeout(totalTimer);
            if (connectTimer) clearTimeout(connectTimer);
            this.activeController = null;
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
        this.stopped = true;
        this.activeController?.abort();
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
    private _connectTimeoutSeconds: number = 5;
    private _syncTimeoutSeconds: number = 15;
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

    connectTimeoutSeconds(seconds: number): this { this._connectTimeoutSeconds = seconds; return this; }
    syncTimeoutSeconds(seconds: number): this { this._syncTimeoutSeconds = seconds; return this; }

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

        const cms = new (DatCmsManager as any)(uri, this._token, 0, manager, null,
            this._connectTimeoutSeconds * 1000, this._syncTimeoutSeconds * 1000);
        cms._logger = this._logger;
        
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
