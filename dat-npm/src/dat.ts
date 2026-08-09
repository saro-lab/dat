import {DatArrayBuffer, DatBytes, DatInteger,} from "./index.js";
import {DatError, DatErrorCodes} from "./error.js";
import {Unixtime} from "infinite-unixtime";

export class Dat {
    public readonly dat: string = '';
    public readonly format: boolean = false;
    public readonly expire: number = 0;
    public readonly cid: bigint = 0n;
    public readonly plainBytes: ArrayBuffer = new ArrayBuffer(0);
    public readonly secureBytes: ArrayBuffer = new ArrayBuffer(0);
    public readonly signature: ArrayBuffer = new ArrayBuffer(0);
    public readonly error: DatError | null = null;

    constructor(dat: string|undefined|null) {
        this.dat = dat || '';
        if (!dat) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "token is empty");
            return;
        }

        const parts = dat.split('.');
        if (parts.length !== 5) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "expected exactly 5 dot-separated fields");
            return;
        }

        const expire = DatInteger.parse(parts[0]);
        if (!Number.isSafeInteger(expire) || expire < 0) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "expire field is not a plain decimal integer");
            return;
        }
        this.expire = expire;

        try {
            this.cid = DatInteger.toCid(parts[1]);
        } catch (e) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "cid field is not a plain hex u64", e);
            return;
        }

        try {
            this.plainBytes = DatArrayBuffer.fromBase64Url(parts[2]);
        } catch (e) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "plain field is not base64url", e);
            return;
        }

        try {
            this.secureBytes = DatArrayBuffer.fromBase64Url(parts[3]);
        } catch (e) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "secure field is not base64url", e);
            return;
        }

        if (parts[4].length === 0) {
            this.error = new DatError(DatErrorCodes.SIG_MALFORMED, "signature field is empty");
            return;
        }
        try {
            this.signature = DatArrayBuffer.fromBase64Url(parts[4]);
        } catch (e) {
            this.error = new DatError(DatErrorCodes.SIG_MALFORMED, "signature field is not base64url", e);
            return;
        }
        if (this.signature.byteLength === 0) {
            this.error = new DatError(DatErrorCodes.SIG_MALFORMED, "signature field is empty");
            return;
        }

        this.format = true;
    }

    throwIfInvalid(): void {
        if (this.error) {
            throw this.error;
        }
    }

    static from(dat: Dat|string|undefined|null): Dat {
        if (dat instanceof Dat) {
            return dat;
        }
        return new Dat(dat);
    }

    expired(): boolean {
        return !this.format || Unixtime.now().afterEq(this.expire, true);
    }

    body(): string {
        return this.dat.substring(0, this.dat.lastIndexOf('.'));
    }
}

export class DatPayload {
    public readonly plainBytes: ArrayBuffer;
    public readonly secureBytes: ArrayBuffer;

    constructor(plain: ArrayBuffer, secure: ArrayBuffer) {
        this.plainBytes = plain;
        this.secureBytes = secure;
    }

    get plain(): string {
        return DatBytes.toUtf8(this.plainBytes);
    }
    get secure(): string {
        return DatBytes.toUtf8(this.secureBytes);
    }

    toString(): string {
        return `${DatArrayBuffer.toBase64Url(this.plainBytes)} ${DatArrayBuffer.toBase64Url(this.secureBytes)}`;
    }

    toUnsafeString(): string {
        return `${this.plain} ${this.secure}`;
    }
}
