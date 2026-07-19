import {assert, describe, it} from 'vitest';
import {DatArrayBuffer, DatArrayBufferLike, DatBytes, DatUint8Array,} from "../index.test.js";

describe('Dat Util', () => {

    it('Convert to base64', () => {
        let string: string =  '???+?> BASE 64 TEST 유니코드';
        let stringBase64 = 'Pz8/Kz8+IEJBU0UgNjQgVEVTVCDsnKDri4jsvZTrk5w=';
        let stringBase64Url = 'Pz8_Kz8-IEJBU0UgNjQgVEVTVCDsnKDri4jsvZTrk5w';

        let arrayBuffer: ArrayBuffer = DatArrayBuffer.fromBase64(stringBase64);
        let uint8Array: Uint8Array<ArrayBuffer> = DatUint8Array.fromBase64(stringBase64);

        assert.strictEqual(DatBytes.toBase64Url(string), stringBase64Url)
        assert.strictEqual(DatBytes.toBase64Url(arrayBuffer), stringBase64Url)
        assert.strictEqual(DatArrayBuffer.toBase64Url(arrayBuffer), stringBase64Url)
        assert.strictEqual(DatBytes.toBase64Url(uint8Array), stringBase64Url)
        assert.strictEqual(DatUint8Array.toBase64Url(uint8Array), stringBase64Url)
        console.log(`[PASS] DatBytes.toBase64Url - ${stringBase64Url}`)

        assert.strictEqual(DatBytes.toUtf8(arrayBuffer), string)
        assert.strictEqual(DatBytes.toUtf8(uint8Array), string)
        console.log(`[PASS] toBase64Url -> toUtf8 - ${string}`)

        arrayBuffer = DatArrayBuffer.fromBase64Url(stringBase64Url);
        uint8Array = DatUint8Array.fromBase64Url(stringBase64Url);
        assert.strictEqual(DatArrayBuffer.toBase64Url(arrayBuffer), stringBase64Url)
        assert.strictEqual(DatUint8Array.toBase64Url(uint8Array), stringBase64Url)
        console.log(`[PASS] DatBytes.toBase64Url - ${stringBase64Url}`)

        assert.strictEqual(DatBytes.toUtf8(arrayBuffer), string)
        assert.strictEqual(DatBytes.toUtf8(uint8Array), string)
        console.log(`[PASS] toBase64Url -> toUtf8 - ${string}`)
    });

    it('Convert to hex', () => {
        let string: string = '안녕하세요 !!';
        let stringHex1 = 'ec9588eb8595ed9598ec84b8ec9a94202121';
        let stringHex2 = 'ec 95 88 eb 85 95 ed 95 98 ec 84 b8 ec 9a 94 20 21 21';
        let arrayBuffer: ArrayBuffer = DatArrayBuffer.from(string);
        let sharedArrayBuffer: SharedArrayBuffer = DatArrayBufferLike.from(arrayBuffer);
        let uint8Array: Uint8Array<ArrayBuffer> = DatUint8Array.from(string);
        let sharedUint8Array: Uint8Array<SharedArrayBuffer> = new Uint8Array(sharedArrayBuffer);

        assert.strictEqual(DatBytes.toHex(arrayBuffer), stringHex1)
        assert.strictEqual(DatBytes.toHex(sharedArrayBuffer), stringHex1)
        assert.strictEqual(DatBytes.toHex(uint8Array), stringHex1)
        assert.strictEqual(DatBytes.toHex(sharedUint8Array), stringHex1)
        console.log(`[PASS] DatBytes.toHex - ${stringHex1}`)

        assert.strictEqual(DatBytes.toHex(arrayBuffer, true), stringHex2)
        assert.strictEqual(DatBytes.toHex(sharedArrayBuffer, true), stringHex2)
        assert.strictEqual(DatBytes.toHex(uint8Array, true), stringHex2)
        assert.strictEqual(DatBytes.toHex(sharedUint8Array, true), stringHex2)
        console.log(`[PASS] DatBytes.toHex - ${stringHex2}`)

        assert.strictEqual(DatBytes.toHex(DatArrayBuffer.from('')), '')
        assert.strictEqual(DatBytes.toHex(DatArrayBuffer.from(null), true), '')
        assert.strictEqual(DatBytes.toHex(DatUint8Array.from(''), true), '')
        assert.strictEqual(DatBytes.toHex(DatUint8Array.from(null)), '')
        assert.strictEqual(DatBytes.toHex(null, true), '')
        assert.strictEqual(DatBytes.toHex(undefined), '')
        console.log(`[PASS] DatBytes.toHex`)

        arrayBuffer = DatArrayBuffer.fromHex(stringHex1);
        uint8Array = DatUint8Array.fromHex(stringHex1);
        assert.strictEqual(DatBytes.toUtf8(arrayBuffer), string)
        assert.strictEqual(DatBytes.toUtf8(uint8Array), string)
        assert.strictEqual(DatBytes.toHex(arrayBuffer), stringHex1)
        assert.strictEqual(DatBytes.toHex(uint8Array, true), stringHex2)
        console.log(`[PASS] From Hex - ${stringHex1} / ${string}`)
    });

    it('Convert to Utf8', () => {
        let string: string = '안녕하세요 !!';
        let arrayBuffer: ArrayBuffer = DatArrayBuffer.from(string);
        let sharedArrayBuffer: SharedArrayBuffer = DatArrayBufferLike.from(arrayBuffer);
        let uint8Array: Uint8Array<ArrayBuffer> = DatUint8Array.from(string);
        let sharedUint8Array: Uint8Array<SharedArrayBuffer> = new Uint8Array(sharedArrayBuffer);

        assert.strictEqual(string.length, 8)
        assert.strictEqual(arrayBuffer.byteLength, 18)
        assert.strictEqual(sharedArrayBuffer.byteLength, 18)
        assert.strictEqual(uint8Array.byteLength, 18)
        assert.strictEqual(sharedUint8Array.byteLength, 18)
        console.log(`[PASS] DatBytes.length`)

        assert.strictEqual(DatBytes.toUtf8(arrayBuffer), string)
        assert.strictEqual(DatBytes.toUtf8(sharedArrayBuffer), string)
        assert.strictEqual(DatBytes.toUtf8(uint8Array), string)
        assert.strictEqual(DatBytes.toUtf8(sharedUint8Array), string)
        console.log(`[PASS] DatBytes.toUtf8`)
    });

    it('DatBytes isEmpty', () => {
        let string: string = '';
        let arrayBuffer: ArrayBuffer = new ArrayBuffer(0);
        let sharedArrayBuffer: SharedArrayBuffer = new SharedArrayBuffer(0);
        let uint8Array: Uint8Array<ArrayBuffer> = new Uint8Array(0);
        let sharedUint8Array: Uint8Array<SharedArrayBuffer> = new Uint8Array(sharedArrayBuffer);

        assert.isTrue(DatBytes.isEmpty(string));
        assert.isTrue(DatBytes.isEmpty(null));
        assert.isTrue(DatBytes.isEmpty(undefined));
        console.log(`[PASS] DatBytes.isEmpty(string)`)

        assert.isTrue(DatBytes.isEmpty(arrayBuffer));
        assert.isTrue(DatBytes.isEmpty(DatArrayBuffer.from(string)));
        assert.isTrue(DatBytes.isEmpty(DatArrayBuffer.from(null)));
        assert.isTrue(DatBytes.isEmpty(DatArrayBuffer.from(undefined)));
        console.log(`[PASS] DatBytes.isEmpty(arrayBuffer)`)

        assert.isTrue(DatBytes.isEmpty(sharedArrayBuffer));
        assert.isTrue(DatBytes.isEmpty(new Uint8Array(DatArrayBufferLike.from(DatArrayBuffer.from(string)))));
        assert.isTrue(DatBytes.isEmpty(new Uint8Array(DatArrayBufferLike.from(DatArrayBuffer.from(null)))));
        assert.isTrue(DatBytes.isEmpty(new Uint8Array(DatArrayBufferLike.from(DatArrayBuffer.from(undefined)))));
        console.log(`[PASS] DatBytes.isEmpty(sharedArrayBuffer)`)

        assert.isTrue(DatBytes.isEmpty(uint8Array));
        assert.isTrue(DatBytes.isEmpty(DatUint8Array.from(string)));
        assert.isTrue(DatBytes.isEmpty(DatUint8Array.from(null)));
        assert.isTrue(DatBytes.isEmpty(DatUint8Array.from(undefined)));
        console.log(`[PASS] DatBytes.isEmpty(uint8Array)`)

        assert.isTrue(DatBytes.isEmpty(sharedUint8Array));
        console.log(`[PASS] DatBytes.isEmpty(sharedUint8Array)`)

        string = '안녕하세요 !!';
        assert.isFalse(DatBytes.isEmpty(string));
        console.log(`[PASS] !DatBytes.isEmpty(string)`)

        arrayBuffer = DatArrayBuffer.from(string);
        assert.isFalse(DatBytes.isEmpty(arrayBuffer));
        console.log(`[PASS] !DatBytes.isEmpty(arrayBuffer)`)

        sharedArrayBuffer = DatArrayBufferLike.from(arrayBuffer);
        assert.isFalse(DatBytes.isEmpty(sharedArrayBuffer));
        console.log(`[PASS] !DatBytes.isEmpty(sharedArrayBuffer)`)

        uint8Array = DatUint8Array.from(string);
        assert.isFalse(DatBytes.isEmpty(uint8Array));
        console.log(`[PASS] !DatBytes.isEmpty(uint8Array)`)

        sharedUint8Array = new Uint8Array(sharedArrayBuffer);
        assert.isFalse(DatBytes.isEmpty(sharedUint8Array));
        console.log(`[PASS] !DatBytes.isEmpty(sharedUint8Array)`)
    });


    it('DatInteger', () => {
        // TODO
    });
});
