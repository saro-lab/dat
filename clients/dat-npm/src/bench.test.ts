import {assert, describe, it} from 'vitest';
import {
    DatCertificate,
    DatCrypto,
    DatCryptoAlgorithms,
    DatManager,
    DatSignature,
    DatSignatureAlgorithms,
    randomBase62,
} from "./index.test.js";
import pLimit from 'p-limit';
import {Unixtime} from "infinite-unixtime";

async function loops(multiThread: boolean, loop: number, certificates: DatCertificate[], plain: string, secure: string): Promise<void> {
    console.info(`\n${ multiThread ? "Multi-Thread" : "Single-Thread"}`)
    const limit = pLimit(multiThread ? 10 : 1);

    for (let certificate of certificates) {
        const pre = certificate.signature.algorithm + ' ' + certificate.crypto.algorithm;

        let time = new Date().getTime();
        const dats = (await Promise.all(Array.from({ length: loop })
            .map(() => limit(async () => DatManager.issue(certificate, plain, secure)) )));
        console.info(`${pre} Issue * ${dats.length} : ${new Date().getTime() - time}ms`);
        const dat = dats[0];

        time = new Date().getTime();
        const payloads = (await Promise.all(Array.from({ length: loop })
            .map(async () => limit(async () => DatManager.parse(certificate, dat)) )));
        console.info(`${pre} Parse * ${payloads.length} : ${new Date().getTime() - time}ms`)

        const payload = payloads[0];
        assert.strictEqual(payload?.plain, plain)
        assert.strictEqual(payload?.secure, secure)
    }
}

describe('DAT Performance', () => {
    it('DAT Performance', { timeout: 120000 }, async () => {

        // @ts-ignore
        if (process.env.BENCH != 'TEST') {
            console.log('Ignore Bench Test if you want this test -> please type:\nnpm run bench\n')
            return;
        }

        const loop = 10000;
        const now = Unixtime.now().time;
        const plain = randomBase62(100)
        const secure = randomBase62(100)

        console.info(`plain: ${plain}`)
        console.info(`secure: ${secure}`)

        const certificates = await Promise.all(DatSignatureAlgorithms
            .flatMap(sa => DatCryptoAlgorithms.map(ca => ({sa, ca})))
            .map(async ({sa, ca}) =>
                new DatCertificate(0, now - 10n, 3600n, 1800n,
                    await DatSignature.generate(sa),
                    await DatCrypto.generate(ca),
                )
            )
        );

        await loops(true, loop, certificates, plain, secure);
        await loops(false, loop, certificates, plain, secure);
    });
});
