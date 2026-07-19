import {describe, it} from 'vitest';
import {DatCertificate, DatCrypto, DatManager, DatSignature,} from "./index.test.js";
import {Unixtime} from "infinite-unixtime";

describe('DAT Example Test', () => {
    it('DAT Example Test', async () => {
        const now = Unixtime.now().$time;
        const certificate = new DatCertificate(
            255, now - 10, 3600n, 1800n,
            await DatSignature.generate("ECDSA-P256"),
            await DatCrypto.generate("IV-AES128-GCM"),
        );

        let manager = DatManager.from([certificate]);

        const plainData = "plain data 유니코드 !!! ABCD"
        const secureData = ">! secure data 암호화 데이터 @@@@"

        let dat = await manager.issue(plainData, secureData);
        console.log(`dat: ${dat}`);

        let payload = await manager.parse(dat);
        console.log(`payload: ${payload.plain} / ${payload.secure}`);


        // get certificate
        let certificates = await manager.exports();
        await manager.imports(certificates, true);

        dat = await manager.issue(plainData, secureData);
        console.log(`dat: ${dat}`);

        payload = await manager.parse(dat);
        console.log(`payload: ${payload.plain} / ${payload.secure}`);
    });

});
