import {DatUint8Array} from "../index.js";
import {DatError, DatErrorCodes} from "../error.js";

const UTF8_ENCODER = new TextEncoder();

export function concat(arr1: ArrayBufferLike|Uint8Array, arr2: ArrayBufferLike|Uint8Array): ArrayBuffer {
    return DatUint8Array.concat(arr1, arr2).buffer;
}

// Adopts a Uint8Array this module has just built. Skips the defensive copy that
// `from` makes, which is only safe because nobody else holds a reference yet.
function owned(data: Uint8Array): ArrayBuffer {
    if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
        return data.buffer as ArrayBuffer;
    }
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

// The returned buffer is always owned by the caller: it never aliases `data`.
// Returning `data.buffer` here used to make `Dat.plainBytes`/`secureBytes` and
// `DatPayload` views onto memory the caller could still mutate afterwards.
export function from(data: ArrayBufferLike|Uint8Array|string|null|undefined): ArrayBuffer {
    if (data === null || data === undefined) {
        return new ArrayBuffer(0);
    } else if (data instanceof ArrayBuffer) {
        return data.slice(0);
    } else if (typeof data === 'string') {
        return data.length === 0 ? new ArrayBuffer(0) : UTF8_ENCODER.encode(data).buffer as ArrayBuffer;
    } else if (data instanceof Uint8Array) {
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    } else if (typeof (data as {byteLength?: unknown}).byteLength === 'number') {
        // SharedArrayBuffer 등 나머지 ArrayBufferLike.
        return new Uint8Array(data as ArrayBufferLike).slice().buffer as ArrayBuffer;
    }
    // 예전에는 여기 오기 전에 DatBytes.isEmpty 가 number/boolean 을 "비었다"고 판정해,
    // issue(12345, 67890) 이 **오류 없이 빈 페이로드**를 만들었다.
    throw new DatError(
        DatErrorCodes.CONFIG_ARGUMENT_INVALID,
        `payload must be string, Uint8Array or ArrayBuffer, got ${typeof data}`,
    );
}

export function fromHex(data: ArrayBufferLike|Uint8Array|string|null|undefined, ignoreSpace: boolean = false): ArrayBuffer {
    if (typeof data === 'string') {
        return owned(DatUint8Array.fromHex(data, ignoreSpace));
    }
    return from(data);
}

export function fromBase64(data: ArrayBufferLike|Uint8Array|string|null|undefined): ArrayBuffer {
    if (typeof data === 'string') {
        return owned(DatUint8Array.fromBase64(data));
    }
    return from(data);
}

export function fromBase64Url(data: ArrayBufferLike|Uint8Array|string|null|undefined): ArrayBuffer {
    if (typeof data === 'string') {
        return owned(DatUint8Array.fromBase64Url(data));
    }
    return from(data);
}

export function toBase64Url(data: ArrayBufferLike): string {
    return DatUint8Array.toBase64Url(DatUint8Array.from(data))
}

export function toHex(data: ArrayBufferLike, space: boolean = false): string {
    return DatUint8Array.toHex(DatUint8Array.from(data), space)
}
