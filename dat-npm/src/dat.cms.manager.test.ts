import {assert, describe, it} from 'vitest';
import {DatCmsManager} from "./index.js";

const sleep = (ms: any) => new Promise((resolve) => setTimeout(resolve, ms))

describe('DatCmsManager Real Connection Test', () => {

    it('should sync and issue/parse DAT', async () => {
        const manager = await DatCmsManager.builder()
            .uri("http://localhost:8088")
            .intervalSeconds(1)
            .logger(console)
            .token("12345678901b")
            .build();

        let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
        let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

        console.log("plain : " + plain);
        console.log("secure : " + secure);

        try {
            const dat = await manager.issue(plain, secure);
            console.log("dat : " + dat);

            const payload = await manager.parse(dat);

            const payloadPlain = payload.plain;
            const payloadSecure = payload.secure;

            console.log("payload plain : " + payloadPlain);
            console.log("payload secure : " + payloadSecure);

        } catch (e) {
            console.error(e);
        }

        await sleep(5000);

        manager.stop();
    }, 10000);
});
