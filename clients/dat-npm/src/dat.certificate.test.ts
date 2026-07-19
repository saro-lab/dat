import {assert, describe, expect, it} from 'vitest';
import {
    DatArrayBuffer,
    DatCertificate,
    DatCrypto,
    DatCryptoAlgorithm,
    DatCryptoAlgorithms,
    DatInteger,
    DatManager,
    DatSignature,
    DatSignatureAlgorithm,
    DatSignatureAlgorithms,
    DatUint8Array,
    randomBase62,
} from "./index.test.js";
import {Unixtime} from "infinite-unixtime";


async function generate(cid: bigint|number, signatureAlgorithm: DatSignatureAlgorithm, cryptoAlgorithm: DatCryptoAlgorithm): Promise<DatCertificate> {
    const now = Unixtime.now().time;
    return new DatCertificate(
        DatInteger.toCid(cid),
        now - 10n, 3600n, 1800n,
        await DatSignature.generate(signatureAlgorithm),
        await DatCrypto.generate(cryptoAlgorithm),
    )
}

describe('Dat Certificate', () => {
    it('Dat Certificate', async () => {

        const failCertificate = await generate(99999, "ECDSA-P256", "IV-AES128-GCM")
        const plain = randomBase62(10)
        const plainBytes = DatArrayBuffer.from(plain)
        const secure = randomBase62(10)
        const secureBytes = DatUint8Array.from(secure)

        console.info(`random plain/secure: ${plain}/${secure}`)

        for (const signatureAlgorithm of DatSignatureAlgorithms) {
            for (const cryptoAlgorithm of DatCryptoAlgorithms) {
                for (let i = 0; i < 10; i++) {
                    const newCertificate = await generate(i, signatureAlgorithm, cryptoAlgorithm);
                    const verifyOnly = newCertificate.pair() && i % 2 == 0;
                    const exportCertificate = await newCertificate.exports(verifyOnly)
                    const importCertificate = await DatCertificate.imports(exportCertificate)
                    const reExportCertificate = await importCertificate.exports(verifyOnly)

                    assert.strictEqual(reExportCertificate, exportCertificate)
                    console.info(`DAT Certificate ${exportCertificate}\n- generate, export, import`);

                    const datFormText = await DatManager.issue(newCertificate, plain, secure);
                    const payloadFromText = await DatManager.parse(importCertificate, datFormText);
                    assert.strictEqual(payloadFromText.plain, plain)
                    assert.strictEqual(payloadFromText.secure, secure)

                    const datFormBytes = await DatManager.issue(newCertificate, plainBytes, secureBytes);
                    const payloadFromBytes = await DatManager.parse(importCertificate, datFormBytes);
                    assert.strictEqual(payloadFromBytes.plain, plain)
                    assert.strictEqual(payloadFromBytes.secure, secure)

                    await (expect(async () => await DatManager.parse(failCertificate, datFormText)).rejects.toThrow());
                    console.info(`- pass dat/payload/fail ${datFormText}`);
                }
            }
        }

        // empty data
        const emptyTestCertificate = await generate(0, "ECDSA-P256", "IV-AES128-GCM")
        const emptyDat = await DatManager.issue(emptyTestCertificate, DatArrayBuffer.from(''), (DatArrayBuffer.from('')));
        const emptyPayload = await DatManager.parse(emptyTestCertificate, emptyDat);
        assert.strictEqual(emptyPayload.plain, '')
        assert.strictEqual(emptyPayload.secure, '')
        console.info(`- pass empty dat ${emptyDat}`);
    });
});
