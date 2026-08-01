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
    /**
     * 파싱이 실패한 이유. 성공이면 null 이다.
     *
     * 예전에는 생성자의 `catch (e) {}` 가 모든 실패를 삼키고 `format=false` 하나만
     * 남겼다. 어느 필드가 왜 틀렸는지가 전부 사라져 호출부는 "Invalid DAT: Format"
     * 밖에 볼 수 없었다.
     */
    public readonly error: DatError | null = null;

    constructor(dat: string|undefined|null) {
        this.dat = dat || '';
        if (!dat) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "token is empty");
            return;
        }

        // 1) 먼저 구조를 확정한다. 파트가 5개가 아니면 그건 만료된 토큰이 아니라
        //    애초에 토큰이 아니다.
        const parts = dat.split('.');
        if (parts.length !== 5) {
            this.error = new DatError(DatErrorCodes.TOKEN_MALFORMED, "expected exactly 5 dot-separated fields");
            return;
        }

        // 2) 구조가 맞은 뒤에야 값을 본다. 필드마다 어디서 틀렸는지 코드를 붙인다.
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

    /** 파싱에 실패했으면 그 코드로 던진다. */
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
