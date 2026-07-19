import {DatBytes, DatUint8Array} from "../index.js";

const UTF8_ENCODER = new TextEncoder();

export function concat(arr1: ArrayBufferLike|Uint8Array, arr2: ArrayBufferLike|Uint8Array): ArrayBuffer {
    return DatUint8Array.concat(arr1, arr2).buffer;
}

export function from(data: ArrayBufferLike|Uint8Array|string|null|undefined): ArrayBuffer {
    if (data instanceof ArrayBuffer) {
        return data;
    } else if (DatBytes.isEmpty(data)) {
        return new ArrayBuffer(0);
    } else if (typeof data === 'string') {
        return UTF8_ENCODER.encode(data).buffer;
    } else if (data instanceof Uint8Array) {
        if (data.byteOffset === 0 && data.buffer instanceof ArrayBuffer && data.byteLength === data.buffer.byteLength) {
            return data.buffer;
        }
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    }
    throw new Error('Unsupported Type');
}

export function fromHex(data: ArrayBufferLike|Uint8Array|string|null|undefined, ignoreSpace: boolean = false): ArrayBuffer {
    if (typeof data === 'string') {
        return from(DatUint8Array.fromHex(data, ignoreSpace));
    }
    return from(data);
}

export function fromBase64(data: ArrayBufferLike|Uint8Array|string|null|undefined): ArrayBuffer {
    if (typeof data === 'string') {
        return from(DatUint8Array.fromBase64(data));
    }
    return from(data);
}

export function fromBase64Url(data: ArrayBufferLike|Uint8Array|string|null|undefined): ArrayBuffer {
    if (typeof data === 'string') {
        return from(DatUint8Array.fromBase64Url(data));
    }
    return from(data);
}

export function toBase64Url(data: ArrayBufferLike): string {
    return DatUint8Array.toBase64Url(DatUint8Array.from(data))
}

export function toHex(data: ArrayBufferLike, space: boolean = false): string {
    return DatUint8Array.toHex(DatUint8Array.from(data), space)
}
