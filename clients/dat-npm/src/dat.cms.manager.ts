import {DatManager, DatPayload, Dat} from "./index.js";

export type Logger = {
    info: () => {},
    warn: () => {},
    error: () => {}
};

export class DatCmsManager {
    private uri: string;
    private token: string;
    private version: number;
    private manager: DatManager;
    private scheduler: any;
    private isSyncing: boolean = false;
    private _logger: Logger|any;

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

    async issue(plain: Uint8Array | string, secure: Uint8Array | string): Promise<string> {
        return this.manager.issue(plain, secure);
    }

    async parse(dat: Dat | string): Promise<DatPayload> {
        return this.manager.parse(dat);
    }

    async sync(): Promise<void> {
        if (this.isSyncing) {
            this._logger.warn("Last request ignored (Duplicate request)");
            return;
        }

        this.isSyncing = true;
        const newUrl = `${this.uri}?version=${this.version}`;

        try {
            const response = await fetch(newUrl, {
                headers: {
                    'Authorization': this.token
                }
            });

            if (response.status !== 200) {
                throw new Error(`response status error, status:${response.status} in ${newUrl}`);
            }

            const body = await response.text();
            const iof = body.indexOf("\n");

            if (iof === 0) {
                throw new Error(`invalid response: ${newUrl}`);
            } else if (iof > 0) {
                const newVersion = parseInt(body.substring(0, iof).trim());
                const newCertificates = body.substring(iof + 1).trim();
                const renew = await this.manager.imports(newCertificates, false);
                this.version = newVersion;
                this._logger.debug(`renew ${renew} certificates: ${newUrl}`);
            } else {
                this._logger.debug(`no new certificate: ${newUrl}`);
            }
        } catch (e: any) {
            let err = e?.cause?.code || e || "unknown error";
            this._logger.error(`[Exception] DAT SMS Sync ${newUrl}: `, err);
        } finally {
            this.isSyncing = false;
        }
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
        info: () => {},
        warn: () => {},
        error: () => {}
    };

    uri(uri: string): this {
        this._uri = new URL(uri);
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
            throw new Error(`uri must be path-less: ${this._uri}`);
        }
        if (this._uri.search.length > 0) {
            throw new Error(`uri must be query-less: ${this._uri}`);
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
