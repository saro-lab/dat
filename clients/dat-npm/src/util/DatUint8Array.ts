import {DatArrayBufferLike, DatBytes} from "../index.js";

const UTF8_ENCODER = new TextEncoder();

function removeSpace(data: string): string {
    return data.replace(/\s+/g, '');
}

export function concat(arr1: ArrayBufferLike|Uint8Array, arr2: ArrayBufferLike|Uint8Array): Uint8Array<ArrayBuffer> {
    const a1 = from(arr1);
    const a2 = from(arr2);
    const result = new Uint8Array(a1.length + a2.length);
    result.set(a1, 0);
    result.set(a2, a1.length);
    return result;
}

export function from(data: ArrayBufferLike|Uint8Array|string|null|undefined): Uint8Array<ArrayBuffer> {
    if (data instanceof Uint8Array) {
        if (data.buffer instanceof ArrayBuffer) {
            return data as Uint8Array<ArrayBuffer>;
        } else if (data.buffer instanceof SharedArrayBuffer) {
            return from(DatArrayBufferLike.toArrayBuffer(data.buffer));
        }
    } else if (DatBytes.isEmpty(data)) {
        return new Uint8Array(0);
    } else if (typeof data === 'string') {
        return UTF8_ENCODER.encode(data);
    } else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data, 0, data.byteLength);
    } else if (data instanceof SharedArrayBuffer) {
        return from(DatArrayBufferLike.toArrayBuffer(data));
    }
    throw new Error('Unsupported Type');
}

export function fromHex(data: ArrayBufferLike|Uint8Array|string|null|undefined, ignoreSpace: boolean = false): Uint8Array<ArrayBuffer> {
    if (typeof data === 'string') {
        return Uint8Array.fromHex(ignoreSpace ? removeSpace(data): data)
    }
    return from(data);
}

export function fromBase64(data: ArrayBufferLike|Uint8Array|string|null|undefined): Uint8Array<ArrayBuffer> {
    if (typeof data === 'string') {
        return Uint8Array.fromBase64(data, {
            "alphabet": "base64",
            "lastChunkHandling": "loose"
        })
    }
    return from(data);
}

export function fromBase64Url(data: ArrayBufferLike|Uint8Array|string|null|undefined): Uint8Array<ArrayBuffer> {
    if (typeof data === 'string') {
        return Uint8Array.fromBase64(data, {
            "alphabet": "base64url",
            "lastChunkHandling": "loose"
        })
    }
    return from(data);
}

export function toBase64Url(data: Uint8Array): string {
    return data.toBase64({"alphabet": "base64url", omitPadding: true})
}

export function toHex(data: Uint8Array, space: boolean = false): string {
    const hex = data.toHex();
    if (space) {
        return (hex.match(/.{2}/g) || []).join(' ');
    } else {
        return hex;
    }
}
