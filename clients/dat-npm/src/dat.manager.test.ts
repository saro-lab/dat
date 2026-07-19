import {assert, describe, expect, it} from 'vitest';
import {
    DatCertificate,
    DatCrypto,
    DatCryptoAlgorithm,
    DatCryptoAlgorithms,
    DatInteger,
    DatManager,
    DatSignature,
    DatSignatureAlgorithm,
    DatSignatureAlgorithms,
    randomBase62,
} from "./index.test.js";
import {Unixtime} from "infinite-unixtime";

async function generate(cid: bigint|number, signatureAlgorithm: DatSignatureAlgorithm, cryptoAlgorithm: DatCryptoAlgorithm): Promise<DatCertificate> {
    const now = Unixtime.now().time;
    return new DatCertificate(
        DatInteger.toCid(cid), now - 10n, 3600n, 1800n,
        await DatSignature.generate(signatureAlgorithm),
        await DatCrypto.generate(cryptoAlgorithm),
    )
}

describe('DAT Manager Test', () => {
    it('DAT Manager Test', async () => {

        let cid: number = 1;
        let certificates: string[] = [];
        let dats: string[] = [];

        const plain = randomBase62(10)
        const secure = randomBase62(10)

        console.info(`random plain/secure: ${plain}/${secure}`)

        for (const signatureAlgorithm of DatSignatureAlgorithms) {
            for (const cryptoAlgorithm of DatCryptoAlgorithms) {
                for (let i = 0; i < 10; i++) {
                    const newCertificate = await generate(cid++, signatureAlgorithm, cryptoAlgorithm);
                    const verifyOnly = newCertificate.pair() && i % 2 == 0;
                    certificates.push(await newCertificate.exports(verifyOnly))
                    dats.push(await DatManager.issue(newCertificate, plain, secure))
                }
            }
        }

        const certificateFormat = certificates.join("\n");
        console.log(`certificates: \n${certificateFormat}\n${dats.length} dats`);


        const inOutManager = new DatManager();
        await inOutManager.imports(certificateFormat);

        const reOutManager = await inOutManager.exports();
        const manager = new DatManager();
        await manager.imports(reOutManager);
        console.log(`Manager Pass import -> export -> import`);

        for (const dat of dats) {
            const payload = await manager.parse(dat);
            assert.strictEqual(payload.plain, plain)
            assert.strictEqual(payload.secure, secure)
            console.log(`- pass dat/payload: ${dat}`);
        }


        const duplicatedCertificates = [certificates[0], certificates[0]].join('\n');
        console.log(`duplicatedCertificates: \n${duplicatedCertificates}`);
        await (expect(async () => await manager.imports(duplicatedCertificates)).rejects.toThrow());
        console.log(`- pass checked duplicated CID (Certificate ID)`);


        for (let i = 0; i < 10; i++) {
            const dat = await inOutManager.issue(plain, secure);
            const payload = await manager.parse(dat);
            assert.strictEqual(payload.plain, plain)
            assert.strictEqual(payload.secure, secure)
            console.log(`- pass dat/payload: ${dat}`);
        }
    });
});
