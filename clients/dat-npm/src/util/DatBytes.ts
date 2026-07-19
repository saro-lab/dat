import {DatUint8Array} from '../index.js';

const UTF8_DECODER = new TextDecoder('utf-8', {fatal: true});

export function isEmpty(data: ArrayBufferLike|Uint8Array|string|null|undefined): boolean {
    if (data) {
        return !(typeof data === 'string' || data.byteLength);
    }
    return true
}

export function toUtf8(data: ArrayBufferLike|Uint8Array|string|null|undefined): string {
    if (!data) {
        return '';
    } else if (typeof data === 'string') {
        return data;
    } else if (data instanceof Uint8Array || data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
        return UTF8_DECODER.decode(data)
    }
    throw new Error('Unsupported Type');
}

export function toBase64Url(data: ArrayBufferLike|Uint8Array|string|null|undefined): string {
    return DatUint8Array.toBase64Url(DatUint8Array.from(data))
}

export function toHex(data: ArrayBufferLike|Uint8Array|string|null|undefined, space: boolean = false): string {
    if (typeof data === 'string') {
        throw new Error('Already String, Use ArrayBufferLike, Uint8Array, null, undefined');
    }
    return DatUint8Array.toHex(DatUint8Array.from(data), space)
}
