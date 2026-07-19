import {assert, describe, it} from 'vitest';
import {DatArrayBuffer, DatSignature, DatSignatureAlgorithms, DatUint8Array, randomBase62,} from "./index.test.js";


describe('signature', () => {
    it('signature', async () => {
        const failKey = await DatSignature.generate("ECDSA-P256")
        const inputText = randomBase62(100)

        console.log(`random text: ${inputText}`)

        for (const algorithm of DatSignatureAlgorithms) {
            console.log(`# ${algorithm}`)
            for (let i = 0; i < 10; i++) {
                const newKey = await DatSignature.generate(algorithm)
                const verifyOnly = newKey.pair() && i % 2 == 0;
                const exportKey = await newKey.exports(verifyOnly)
                const importKey = await DatSignature.imports(algorithm, exportKey)
                const reExportKey = await importKey.exports(verifyOnly)

                assert.strictEqual(reExportKey, exportKey)
                console.info(`Signature Key ${algorithm} ${exportKey}\n- generate, export, import`)

                const signature = await newKey.sign(inputText);
                const signatureBase64 = DatArrayBuffer.toBase64Url(signature);
                assert.strictEqual(await importKey.verify(inputText, signature), true)
                assert.strictEqual(await importKey.verify(DatArrayBuffer.from(inputText), signature), true)
                assert.strictEqual(await importKey.verify(DatUint8Array.from(inputText), signature), true)
                assert.strictEqual(await importKey.verify(inputText, signatureBase64), true)
                assert.strictEqual(await failKey.verify(inputText, signature), false)

                console.info(`- pass sign / verify / fail: ${signature.byteLength}`)

            }
        }
    });
});
