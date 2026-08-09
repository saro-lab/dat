import {DatError, DatErrorCodes} from "../error.js";

export const U64_MAX = 0xffffffffffffffffn;
const DECIMAL = /^[0-9]+$/;
const HEX = /^[0-9a-fA-F]+$/;

export function parse(no: number|string): number {
    if (typeof no === 'string') {
        no = DECIMAL.test(no) ? Number(no) : Number.NaN;
    }
    return Number.isSafeInteger(no) ? no : Number.NaN;
}

export function toCid(cid: number|string|bigint, error: string = 'Invalid CID'): bigint {
    try {
        let c: bigint|null = null;
        switch (typeof cid) {
            case 'bigint': c = cid; break;
            case 'number': c = Number.isSafeInteger(cid) ? BigInt(cid) : null; break;
            case 'string': c = HEX.test(cid) ? BigInt(`0x${cid}`) : null; break;
        }
        if (c != null && c >= 0n && c <= U64_MAX) {
            return c;
        }
    } catch (e) {}
    throw new DatError(DatErrorCodes.CONFIG_ARGUMENT_INVALID, error);
}

export function toBigInt(no: bigint|number|string, errorMessage: string = 'is not integer', min: bigint|undefined = undefined, max: bigint|undefined = undefined): bigint {
    try {
        if (typeof no === 'string' && !DECIMAL.test(no)) {
            throw new Error();
        }
        if (typeof no === 'number' && !Number.isSafeInteger(no)) {
            throw new Error();
        }
        let n = BigInt(no);
        if (typeof min !== 'undefined' && !(n >= min)) {
            throw new Error();
        }
        if (typeof max !== 'undefined' && !(n <= max)) {
            throw new Error();
        }
        return n;
    } catch (e) {}
    throw new DatError(DatErrorCodes.CONFIG_ARGUMENT_INVALID, errorMessage);
}
