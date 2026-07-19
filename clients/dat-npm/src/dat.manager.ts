import {Dat, DatArrayBuffer, DatBytes, DatCertificate, DatPayload,} from "./index.js";
import {Unixtime} from "infinite-unixtime";

export class DatManager {
    private issuer: DatCertificate | null;
    private certificates: DatCertificate[];
    private certificateMap: Map<bigint, DatCertificate>;

    constructor(issuer: DatCertificate | null = null, certificates: DatCertificate[] = []) {
        this.issuer = issuer;
        this.certificates = certificates;
        this.certificateMap = new Map(certificates.map(e => [e.cid, e]));
    }

    static from(inputCertificates: DatCertificate[]): DatManager {
        const manager = new DatManager();
        manager.importCertificates(inputCertificates, true);
        return manager;
    }

    async imports(format: string, clear: boolean = false): Promise<number> {
        const lines = format.split('\n')
            .map(e => e.trim())
            .filter(e => e !== '');
        const certificates = await Promise.all(
            lines.map(async (e) => await DatCertificate.imports(e))
        );
        return this.importCertificates(certificates, clear);
    }

    importCertificates(inputCertificates: DatCertificate[], clear: boolean = false): number {
        let renew = 0;
        let list: DatCertificate[] = [];

        const cids = new Set();
        for (const certificate of inputCertificates) {
            if (cids.has(certificate.cid)) {
                throw new Error(`Invalid DAT Certificates - Duplicate CID(Certificate ID) ${certificate.cid}`);
            }
            cids.add(certificate.cid);
        }

        if (clear) {
            list = [...inputCertificates];
        } else {
            list = [...this.certificates];
            for (const certificate of inputCertificates) {
                if (!this.certificateMap.has(certificate.cid)) {
                    renew++;
                    list.push(certificate);
                }
            }
        }

        this.certificates = list
            .filter(e => !e.expired())
            .sort((a, b) => {
                if (a.datIssuanceEndSeconds == b.datIssuanceEndSeconds) {
                    return 0;
                } else {
                    return a.datIssuanceEndSeconds < b.datIssuanceEndSeconds ? -1 : 1;
                }
            });

        this.certificateMap = new Map(this.certificates.map(e => [e.cid, e]));
        this.issuer = this.certificates.findLast(e => e.issuable()) || null;

        return clear ? this.certificates.length : renew;
    }

    async exports(verifyOnly: boolean = false): Promise<string> {
        return (await Promise.all(this.certificates.map(e => e.exports(verifyOnly)))).join('\n')
    }

    find(cid: bigint): DatCertificate | null {
        return this.certificateMap.get(cid) || null;
    }

    async issue(plain: ArrayBufferLike|Uint8Array|string|null|undefined, secure: ArrayBufferLike|Uint8Array|string|null|undefined): Promise<string> {
        if (this.issuer) {
            return await DatManager.issue(this.issuer, plain, secure);
        }
        throw new Error("Invalid DAT: Signing Key Does Not Exist");
    }

    async parse(dat: Dat|string|undefined|null): Promise<DatPayload> {
        dat = Dat.from(dat);
        if (!dat.format) {
            throw new Error("Invalid DAT: Format");
        }
        const certificate = this.find(dat.cid);
        if (certificate != null) {
            return DatManager.parse(certificate, dat);
        }
        throw new Error("Invalid DAT: CID(Certificate ID) Not Found");
    }

    static async issue(certificate: DatCertificate, plain: ArrayBufferLike|Uint8Array|string|null|undefined, secure: ArrayBufferLike|Uint8Array|string|null|undefined): Promise<string> {
        const now = Unixtime.now().time;
        const expire = now + certificate.datTtlSeconds;
        const cid = certificate.cid.toString(16);
        const plainBase64 = DatBytes.toBase64Url(plain);
        const securedBase64 = DatArrayBuffer.toBase64Url(await certificate.crypto.encrypt(secure));
        const body = `${expire}.${cid}.${plainBase64}.${securedBase64}`;
        const signature = DatArrayBuffer.toBase64Url(await certificate.signature.sign(body));
        return `${body}.${signature}`;
    }

    static async parse(certificate: DatCertificate, dat: Dat|string|undefined|null): Promise<DatPayload> {
        dat = Dat.from(dat);
        if (!dat.format) {
            throw new Error("Invalid DAT: Format");
        }
        if (dat.expired()) {
            throw new Error("Invalid DAT: Expired");
        }
        if (!await certificate.signature.verify(dat.body(), dat.signature)) {
            throw new Error('Invalid DAT: Signature');
        }
        return new DatPayload(dat.plainBytes, await certificate.crypto.decrypt(dat.secureBytes))
    }
}
