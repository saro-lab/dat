import {Dat, DatArrayBuffer, DatBytes, DatCertificate, DatPayload,} from "./index.js";
import {DatError, DatErrorCodes} from "./error.js";
import {Unixtime} from "infinite-unixtime";

function noIssuableCause(certificates: DatCertificate[]): DatError {
    const now = Unixtime.now().time;
    let signableSeen = false, notYet = false, ended = false;

    for (const certificate of certificates) {
        if (!certificate.signable()) {
            continue;
        }
        signableSeen = true;
        if (now < certificate.datIssuanceStartSeconds) {
            notYet = true;
        } else if (now > certificate.datIssuanceEndSeconds) {
            ended = true;
        }
    }

    if (!signableSeen) return new DatError(DatErrorCodes.CERT_VERIFY_ONLY);
    if (notYet) return new DatError(DatErrorCodes.CERT_NOT_YET_ISSUABLE);
    if (ended) return new DatError(DatErrorCodes.CERT_ISSUANCE_ENDED);
    return new DatError(DatErrorCodes.CERT_EXPIRED);
}

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
                throw new DatError(DatErrorCodes.CERT_DUPLICATE_CID, `duplicate cid ${certificate.cid.toString(16)}`);
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
        if (this.certificates.length === 0) {
            throw new DatError(DatErrorCodes.MANAGER_NO_CERTIFICATE);
        }
        throw new DatError(
            DatErrorCodes.MANAGER_NO_ISSUABLE_CERTIFICATE,
            undefined,
            noIssuableCause(this.certificates),
        );
    }

    async parse(dat: Dat|string|undefined|null): Promise<DatPayload> {
        dat = Dat.from(dat);
        dat.throwIfInvalid();
        const certificate = this.find(dat.cid);
        if (certificate != null) {
            return DatManager.parse(certificate, dat);
        }
        throw new DatError(DatErrorCodes.CERT_NOT_FOUND, `cid ${dat.cid.toString(16)}`);
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
        dat.throwIfInvalid();
        if (dat.expired()) {
            throw new DatError(DatErrorCodes.TOKEN_EXPIRED);
        }
        let verified: boolean;
        try {
            verified = await certificate.signature.verify(dat.body(), dat.signature);
        } catch (e) {
            throw new DatError(DatErrorCodes.SIG_BACKEND, "signature verification failed to run", e);
        }
        if (!verified) {
            throw new DatError(DatErrorCodes.SIG_MISMATCH);
        }
        return new DatPayload(dat.plainBytes, await certificate.crypto.decrypt(dat.secureBytes))
    }
}
