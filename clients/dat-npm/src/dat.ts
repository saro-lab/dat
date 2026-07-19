import {DatArrayBuffer, DatBytes, DatInteger,} from "./index.js";
import {Unixtime} from "infinite-unixtime";

export class Dat {
    public readonly dat: string = '';
    public readonly format: boolean = false;
    public readonly expire: number = 0;
    public readonly cid: bigint = 0n;
    public readonly plainBytes: ArrayBuffer = new ArrayBuffer(0);
    public readonly secureBytes: ArrayBuffer = new ArrayBuffer(0);
    public readonly signature: ArrayBuffer = new ArrayBuffer(0);

    constructor(dat: string|undefined|null) {
        if (dat) {
            const parts = (this.dat = dat || '').split('.');
            if (dat && parts.length == 5) {
                try {
                    this.expire = DatInteger.parse(parts[0]);
                    this.cid = DatInteger.toCid(parts[1]);
                    this.plainBytes = DatArrayBuffer.fromBase64Url(parts[2]);
                    this.secureBytes = DatArrayBuffer.fromBase64Url(parts[3]);
                    this.signature = DatArrayBuffer.fromBase64Url(parts[4]);
                    this.format = (this.signature.byteLength > 0 && this.expire >= 0);
                } catch (e) {}
            }
        }
    }

    static from(dat: Dat|string|undefined|null): Dat {
        if (dat instanceof Dat) {
            return dat;
        }
        return new Dat(dat);
    }

    expired(): boolean {
        return !this.format || Unixtime.now().after(this.expire, true);
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
