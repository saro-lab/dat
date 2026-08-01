import {describe, expect, it} from "vitest";
import {Unixtime} from "infinite-unixtime";
import {
    Dat,
    DatCertificate,
    DatCrypto,
    DatError,
    DatErrorCodes,
    DatManager,
    DatSignature,
} from "./index.js";

// 오류 코드 회귀 안전망 (error.pre2.md).
//
// 단언하는 것은 "실패했다"가 아니라 **어느 코드로 실패했다** 이다 — 재매핑 사고는
// 전자로는 절대 안 잡힌다.

const SIG = "ECDSA-P256";
const CRY = "IV-AES256-GCM";

async function certificate(cid: bigint, startOffset: bigint, duration: bigint, ttl: bigint): Promise<DatCertificate> {
    const now = Unixtime.now().time;
    return new DatCertificate(
        cid, now + startOffset, duration, ttl,
        await DatSignature.generate(SIG), await DatCrypto.generate(CRY),
    );
}

async function issuableManager(cid: bigint = 1n): Promise<DatManager> {
    return DatManager.from([await certificate(cid, -10n, 200n, 100n)]);
}

/** 던져진 값이 DatError 인지 확인하고 코드를 돌려준다. */
async function codeOf(fn: () => unknown | Promise<unknown>): Promise<string> {
    try {
        await fn();
    } catch (e) {
        expect(e, `expected a DatError, got ${e}`).toBeInstanceOf(DatError);
        return (e as DatError).code;
    }
    throw new Error("expected an error, got success");
}

async function errorOf(fn: () => unknown | Promise<unknown>): Promise<DatError> {
    try {
        await fn();
    } catch (e) {
        expect(e).toBeInstanceOf(DatError);
        return e as DatError;
    }
    throw new Error("expected an error, got success");
}

describe("만료 / 형식 오류 / 서명 위조", () => {
    it("만료는 형식 오류가 아니다", async () => {
        const manager = await issuableManager();
        const token = await manager.issue("p", "s");
        const rest = token.substring(token.indexOf(".") + 1);
        const now = Unixtime.now().time;

        expect(await codeOf(() => manager.parse(`${now - 1n}.${rest}`)))
            .toBe(DatErrorCodes.TOKEN_EXPIRED);
        // 정각도 만료다.
        expect(await codeOf(() => manager.parse(`${now}.${rest}`)))
            .toBe(DatErrorCodes.TOKEN_EXPIRED);
    });

    it("구조가 깨진 토큰은 MALFORMED", async () => {
        const manager = await issuableManager();
        const token = await manager.issue("p", "s");
        const parts = token.split(".");

        // 파트 수 부족 / 초과
        expect(await codeOf(() => manager.parse("1.2.3"))).toBe(DatErrorCodes.TOKEN_MALFORMED);
        expect(await codeOf(() => manager.parse(token + ".extra"))).toBe(DatErrorCodes.TOKEN_MALFORMED);
        // expire 가 10진수가 아님 — 만료가 아니라 형식 오류다
        expect(await codeOf(() => manager.parse("+" + token))).toBe(DatErrorCodes.TOKEN_MALFORMED);
        // cid 가 16진수가 아님
        expect(await codeOf(() => manager.parse([parts[0], "zz", ...parts.slice(2)].join("."))))
            .toBe(DatErrorCodes.TOKEN_MALFORMED);
    });

    it("빈 서명은 SIG_MALFORMED", async () => {
        const manager = await issuableManager();
        const token = await manager.issue("p", "s");
        const parts = token.split(".");

        expect(await codeOf(() => manager.parse(parts.slice(0, 4).join(".") + ".")))
            .toBe(DatErrorCodes.SIG_MALFORMED);
    });

    it("위조된 서명은 SIG_MISMATCH 이고 보안 이벤트다", async () => {
        // 같은 cid 를 다른 키로 발급하면 서명만 안 맞는다.
        const victim = await issuableManager(7n);
        const attacker = await issuableManager(7n);
        const forged = await attacker.issue("p", "s");

        const err = await errorOf(() => victim.parse(forged));
        expect(err.code).toBe(DatErrorCodes.SIG_MISMATCH);
        expect(err.securityEvent).toBe(true);
        expect(err.retry).toBe("permanent");
    });

    it("변조된 secure 는 CRYPTO_TAG_MISMATCH", async () => {
        const manager = await issuableManager();
        const cert = manager.find(1n)!;
        const token = await DatManager.issue(cert, "plain", "secure-payload");
        const parts = token.split(".");

        const secure = parts[3];
        const last = secure[secure.length - 1];
        parts[3] = secure.slice(0, -1) + (last === "A" ? "B" : "A");

        // 서명 검증을 건너뛰는 경로에서는 GCM 태그가 유일한 무결성 검사다.
        const dat = new Dat(parts.join("."));
        const err = await errorOf(() => cert.crypto.decrypt(dat.secureBytes));
        expect(err.code).toBe(DatErrorCodes.CRYPTO_TAG_MISMATCH);
        expect(err.securityEvent).toBe(true);
    });
});

describe("인증서", () => {
    it("모르는 cid 는 CERT_NOT_FOUND", async () => {
        const manager = await issuableManager(1n);
        const other = await issuableManager(999n);
        const token = await other.issue("p", "s");

        expect(await codeOf(() => manager.parse(token))).toBe(DatErrorCodes.CERT_NOT_FOUND);
    });

    it("import 안의 cid 중복", async () => {
        const a = await certificate(5n, -10n, 200n, 100n);
        const b = await certificate(5n, -10n, 200n, 100n);

        expect(await codeOf(() => DatManager.from([a, b]))).toBe(DatErrorCodes.CERT_DUPLICATE_CID);
    });

    it("깨진 인증서는 CERT_MALFORMED", async () => {
        expect(await codeOf(() => DatCertificate.imports("a.b.c"))).toBe(DatErrorCodes.CERT_MALFORMED);
        // 8 파트지만 cid 가 16진수가 아님
        expect(await codeOf(() => DatCertificate.imports("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA")))
            .toBe(DatErrorCodes.CERT_MALFORMED);
    });
});

describe("발급할 인증서 없음 — 다섯 갈래", () => {
    it("인증서 0건", async () => {
        const err = await errorOf(() => new DatManager().issue("p", "s"));
        expect(err.code).toBe(DatErrorCodes.MANAGER_NO_CERTIFICATE);
        // CMS 접속 문제일 수 있으므로 기다려 볼 값어치가 있다.
        expect(err.retry).toBe("transient");
    });

    it("발급창 시작 전 — 기다리면 풀린다", async () => {
        const manager = DatManager.from([await certificate(1n, 3600n, 200n, 100n)]);

        const err = await errorOf(() => manager.issue("p", "s"));
        expect(err.code).toBe(DatErrorCodes.MANAGER_NO_ISSUABLE_CERTIFICATE);
        expect((err.cause as DatError).code).toBe(DatErrorCodes.CERT_NOT_YET_ISSUABLE);
        expect(err.retry).toBe("transient");
    });

    it("발급창 종료 — 기다려도 안 풀린다", async () => {
        // 발급창은 닫혔지만 ttl 이 남아 검증은 된다.
        const manager = DatManager.from([await certificate(1n, -500n, 100n, 3600n)]);

        const err = await errorOf(() => manager.issue("p", "s"));
        expect(err.code).toBe(DatErrorCodes.MANAGER_NO_ISSUABLE_CERTIFICATE);
        expect((err.cause as DatError).code).toBe(DatErrorCodes.CERT_ISSUANCE_ENDED);
        expect(err.retry).toBe("permanent");
    });

    it("verify-only 뿐 — 배포 설정 실수", async () => {
        const source = await certificate(1n, -10n, 200n, 100n);
        const verifyOnly = await DatCertificate.imports(await source.exports(true));
        const manager = DatManager.from([verifyOnly]);

        const err = await errorOf(() => manager.issue("p", "s"));
        expect(err.code).toBe(DatErrorCodes.MANAGER_NO_ISSUABLE_CERTIFICATE);
        expect((err.cause as DatError).code).toBe(DatErrorCodes.CERT_VERIFY_ONLY);
        expect(err.retry).toBe("permanent");
    });
});

describe("키 · 알고리즘 · 인자", () => {
    it("모르는 알고리즘 이름", async () => {
        expect(await codeOf(() => DatSignature.generate("NOPE" as never)))
            .toBe(DatErrorCodes.CONFIG_ALG_UNSUPPORTED);
        expect(await codeOf(() => DatCrypto.generate("NOPE" as never)))
            .toBe(DatErrorCodes.CONFIG_ALG_UNSUPPORTED);
    });

    it("키 길이 불일치는 KEY_INVALID", async () => {
        expect(await codeOf(() => DatCrypto.imports(CRY, "AAAA"))).toBe(DatErrorCodes.KEY_INVALID);
        expect(await codeOf(() => DatSignature.imports("HMAC-SHA256-MFS", "AAAA")))
            .toBe(DatErrorCodes.KEY_INVALID);
        expect(await codeOf(() => DatSignature.imports(SIG, "AAAA"))).toBe(DatErrorCodes.KEY_INVALID);
    });

    it("HMAC 의 verify-only 는 구조적으로 불가", async () => {
        // 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
        const hmac = await DatSignature.generate("HMAC-SHA256-MFS");
        expect(await codeOf(() => hmac.exports(true))).toBe(DatErrorCodes.KEY_VERIFY_ONLY_UNSUPPORTED);
    });

    it("verify-only 키로 서명하면 SIG_KEY_MISSING", async () => {
        const source = await DatSignature.generate(SIG);
        const publicOnly = await DatSignature.imports(SIG, await source.exports(true));
        expect(await codeOf(() => publicOnly.sign("body"))).toBe(DatErrorCodes.SIG_KEY_MISSING);
    });

    it("IV 보다 짧은 암호문", async () => {
        const crypto = await DatCrypto.generate(CRY);
        expect(await codeOf(() => crypto.decrypt("AAAA"))).toBe(DatErrorCodes.CRYPTO_DATA_INVALID);
    });

    it("빈 secure 페이로드는 오류가 아니다", async () => {
        // 빈 입력 → 빈 출력. 모든 공식 클라이언트 공통이며 어떤 코드도 내지 않는다.
        const crypto = await DatCrypto.generate(CRY);
        expect((await crypto.encrypt("")).byteLength).toBe(0);
        expect((await crypto.decrypt("")).byteLength).toBe(0);
    });

    it("payload 에 number 를 넘기면 조용히 비지 않고 오류가 난다", async () => {
        // issue(12345, 67890) 이 오류 없이 빈 페이로드를 만들던 자리다.
        const manager = await issuableManager();
        expect(await codeOf(() => manager.issue(12345 as never, 67890 as never)))
            .toBe(DatErrorCodes.CONFIG_ARGUMENT_INVALID);
    });
});

describe("코드 체계 자체의 불변식", () => {
    it("모든 코드가 DAT_ 로 시작하는 SCREAMING_SNAKE_CASE 다", () => {
        for (const code of Object.values(DatErrorCodes)) {
            expect(code).toMatch(/^DAT_[A-Z_]+$/);
        }
    });

    it("코드가 메시지 머리에 온다", () => {
        expect(new DatError(DatErrorCodes.TOKEN_EXPIRED).message)
            .toBe("DAT_TOKEN_EXPIRED");
        expect(new DatError(DatErrorCodes.TOKEN_MALFORMED, "bad field").message)
            .toBe("DAT_TOKEN_MALFORMED: bad field");
    });

    it("영구 CMS 오류는 재시도하지 않는다", () => {
        // 401 에 60초마다 영원히 재시도하던 것이 이 분류의 존재 이유다.
        for (const code of [DatErrorCodes.CMS_UNAUTHORIZED, DatErrorCodes.CMS_FORBIDDEN, DatErrorCodes.CMS_ENDPOINT_NOT_FOUND]) {
            expect(new DatError(code).retry, code).toBe("permanent");
        }
        for (const code of [DatErrorCodes.CMS_UNREACHABLE, DatErrorCodes.CMS_SERVER_ERROR, DatErrorCodes.CMS_NOT_SYNCED]) {
            expect(new DatError(code).retry, code).toBe("transient");
        }
        for (const code of [DatErrorCodes.CMS_SYNC_IN_PROGRESS, DatErrorCodes.CMS_VERSION_RESET]) {
            expect(new DatError(code).retry, code).toBe("state");
        }
    });
});
