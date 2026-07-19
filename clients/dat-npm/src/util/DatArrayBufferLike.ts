import {DatArrayBuffer} from "../index.js";

export function from(data: ArrayBufferLike|Uint8Array): SharedArrayBuffer {
    if (data instanceof Uint8Array) {
        const buffer = data.buffer;
        if (buffer instanceof SharedArrayBuffer) {
            return buffer;
        } else if(buffer instanceof ArrayBuffer) {
            return toSharedArrayBuffer(DatArrayBuffer.from(data))
        }
    }
    return toSharedArrayBuffer(data as ArrayBufferLike)
}

export function toArrayBuffer(data: ArrayBufferLike): ArrayBuffer {
    if (data instanceof ArrayBuffer) {
        return data;
    } else if (data instanceof SharedArrayBuffer) {
        const result = new ArrayBuffer(data.byteLength);
        new Uint8Array(result).set(new Uint8Array(data));
        return result;
    }
    throw new Error('Unsupported Type');
}

export function toSharedArrayBuffer(data: ArrayBufferLike): SharedArrayBuffer {
    if (data instanceof SharedArrayBuffer) {
        return data;
    } else if (data instanceof ArrayBuffer) {
        const result = new SharedArrayBuffer(data.byteLength);
        new Uint8Array(result).set(new Uint8Array(data));
        return result;
    }
    throw new Error('Unsupported Type');
}
