import {assert, describe, expect, it} from 'vitest';
import {DatArrayBuffer, DatBytes, DatCrypto, DatCryptoAlgorithms, randomBase62,} from "./index.test.js";


describe('crypto', () => {
    it('crypto', async () => {

        const failKey = await DatCrypto.generate("IV-AES128-GCM");
        const inputText = randomBase62(100);

        console.log(`random text: ${inputText}`)

        for (const algorithm of DatCryptoAlgorithms) {
            for (let i = 0; i < 10; i++) {
                const newKey = await DatCrypto.generate(algorithm)
                const exportKey = await newKey.exports()
                const importKey = await DatCrypto.imports(algorithm, exportKey)
                const reExportKey = await importKey.exports()

                assert.strictEqual(reExportKey, exportKey)
                console.info(`Crypto Key ${algorithm} ${exportKey}\n- generate, export, import`)

                const encrypted = await newKey.encrypt(inputText);
                const encryptedBase64Url = DatArrayBuffer.toBase64Url(encrypted);

                const decrypted = DatBytes.toUtf8(await importKey.decrypt(encrypted));
                const decryptedBase64 = DatBytes.toUtf8(await importKey.decrypt(encryptedBase64Url));
                assert.strictEqual(decrypted, inputText)
                assert.strictEqual(decryptedBase64, inputText)

                await (expect(async () => await failKey.decrypt(decrypted)).rejects.toThrow());

                console.info(`- pass encrypted / decrypted / fail: ${encryptedBase64Url}`)
            }
        }
    });
});
