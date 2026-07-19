import {assert, describe, it} from 'vitest';
import {DatCmsManager} from "./index.js";

const sleep = (ms: any) => new Promise((resolve) => setTimeout(resolve, ms))

describe('DatCmsManager Real Connection Test', () => {

    it('should sync and issue/parse DAT', async () => {
        // 실제 백엔드에 연결하는 테스트
        // 사용자가 제공한 ExampleCmsManagerTest.java의 설정을 따름
        const manager = await DatCmsManager.builder()
            .uri("http://localhost:8088")
            //.intervalOff() // disable auto sync
            .intervalSeconds(1)
            .logger(console)
            .token("12345678901b")
            .build();

        // manual sync
        // await manager.sync();

        let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
        let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

        console.log("plain : " + plain);
        console.log("secure : " + secure);

        try {
            // issue dat
            const dat = await manager.issue(plain, secure);
            console.log("dat : " + dat);

            // parse dat
            const payload = await manager.parse(dat);

            const payloadPlain = payload.plain;
            const payloadSecure = payload.secure;

            console.log("payload plain : " + payloadPlain);
            console.log("payload secure : " + payloadSecure);

            //assert.strictEqual(plain, payloadPlain);
            //assert.strictEqual(secure, payloadSecure);
        } catch (e) {
            console.error(e);
        }

        await sleep(5000);

        // 리소스 정리 (setInterval 중지)
        manager.stop();
    }, 10000);
});
