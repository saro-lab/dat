import {describe, expect, it, vi} from "vitest";
import {readFile} from "node:fs/promises";
import {DatCmsManager, DatManager, DatError} from "./index.js";

const fixture = JSON.parse(await readFile(new URL("../test/fixtures/cms_v1_state_transitions.json", import.meta.url), "utf8"));

function body(case_: any): Uint8Array {
    const parts = case_.input.body.map(([kind, value]: [string, string]) => {
        if (kind === "ascii") return Buffer.from(value, "ascii");
        if (kind === "hex") return Buffer.from(value, "hex");
        return Buffer.from(fixture.certificates[value].wire_ascii, "ascii");
    });
    return Buffer.concat(parts);
}

async function manager(stateName: string): Promise<any> {
    const manager = new DatManager();
    for (const key of fixture.states[stateName].certificates) {
        await manager.imports(fixture.certificates[key].wire_ascii, false);
    }
    const cms = new (DatCmsManager as any)("http://fixture.invalid/v1/certs", "", Number(fixture.states[stateName].version), manager, null, 0, 0);
    cms._logger = {debug: () => {}, warn: () => {}, error: () => {}, info: () => {}};
    return cms;
}

describe("G0 CMS fixture", () => {
    it.each(fixture.cases)("$id", async (case_: any) => {
        const cms = await manager(case_.initial);
        const want = case_.expect || case_.expect_by_profile.safe_integer;
        if (case_.input.kind === "transport") {
            vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("transport")));
        } else {
            const bytes = body(case_);
            vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
                status: case_.input.status,
                ok: case_.input.status >= 200 && case_.input.status <= 299,
                arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
            }));
        }
        if (want.error) {
            await expect(cms.syncOrThrow()).rejects.toMatchObject({code: want.error.split("(")[0], retry: want.retry});
        } else {
            await cms.syncOrThrow();
        }
        const state = fixture.states[want.state];
        expect(cms.getVersion()).toBe(Number(state.version));
        expect((await cms.getManager().exports()).split("\n").filter(Boolean)).toEqual(
            state.certificates.map((key: string) => fixture.certificates[key].wire_ascii),
        );
        vi.unstubAllGlobals();
    });
});

it("cleans timeout state when a non-2xx response returns before its body", async () => {
    vi.useFakeTimers();
    const cms = await manager("seeded");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({status: 500, ok: false}));
    await expect(cms.syncOrThrow()).rejects.toMatchObject({code: "DAT_CMS_SERVER_ERROR"});
    expect(cms.activeController).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    vi.unstubAllGlobals();
    vi.useRealTimers();
});
