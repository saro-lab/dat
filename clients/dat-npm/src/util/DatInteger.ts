
export function parse(no: number|string): number {
    if (typeof no === 'string') {
        no = no ? Number(no) : Number.NaN;
    }
    return Number.isSafeInteger(no) ? no : Number.NaN;
}

export function toCid(cid: number|string|bigint, error: string = 'Invalid CID'): bigint {
    try {
        let c: bigint|null = null;
        switch (typeof cid) {
            case 'bigint': c = cid; break;
            case 'number': c = BigInt(cid); break;
            case 'string': c = BigInt(`0x${cid}`); break;
        }
        if (c != null && c >= 0n && c <= 0xffffffffffffffffn) {
            return c;
        }
    } catch (e) {}
    throw new Error(error);
}

export function toBigInt(no: bigint|number|string, errorMessage: string = 'is not integer', min: bigint|undefined = undefined, max: bigint|undefined = undefined): bigint {
    try {
        let n = BigInt(no);
        if (typeof min !== 'undefined' && !(n >= min)) {
            throw new Error();
        }
        if (typeof max !== 'undefined' && !(n <= max)) {
            throw new Error();
        }
        return n;
    } catch (e) {}
    throw new Error(errorMessage);
}
