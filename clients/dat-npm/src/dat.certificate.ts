import {DatCrypto, DatInteger, DatSignature,} from "./index.js";
import {Unixtime} from "infinite-unixtime";

export class DatCertificate {
    public readonly cid: bigint;
    public readonly signature: DatSignature;
    public readonly crypto: DatCrypto;
    public readonly datIssuanceStartSeconds: bigint;
    public readonly datIssuanceEndSeconds: bigint;
    public readonly datTtlSeconds: bigint;

    constructor(
        cid: bigint|number|string,
        datIssuanceStartSeconds: number|bigint|string,
        datIssuanceDurationSeconds: number|bigint|string,
        datTtlSeconds: number|bigint|string,
        signature: DatSignature,
        crypto: DatCrypto
    ) {
        this.cid = DatInteger.toCid(cid, `Invalid cid(Certificate ID) is HEX ${cid}`)
        this.signature = signature;
        this.crypto = crypto;
        datIssuanceStartSeconds = DatInteger.toBigInt(datIssuanceStartSeconds, `Invalid: issuedAt is positive int or 0 ${datIssuanceStartSeconds}`, 0n);
        datIssuanceDurationSeconds = DatInteger.toBigInt(datIssuanceDurationSeconds, `Invalid: datIssueEnd is positive int or 0 ${datIssuanceDurationSeconds}`, 0n);
        datTtlSeconds = DatInteger.toBigInt(datTtlSeconds, `Invalid: datTtl is positive int or 0 ${datTtlSeconds}`, 0n);
        this.datIssuanceStartSeconds = datIssuanceStartSeconds;
        this.datIssuanceEndSeconds = datIssuanceStartSeconds + datIssuanceDurationSeconds;
        this.datTtlSeconds = datTtlSeconds;
    }

    async exports(verifyOnly: boolean = false): Promise<string> {
        const cid = this.cid.toString(16);
        const datIssuanceStartSeconds = this.datIssuanceStartSeconds.toString();
        const datIssuanceDurationSeconds = (this.datIssuanceEndSeconds - this.datIssuanceStartSeconds).toString();
        const datTtlSeconds = this.datTtlSeconds.toString();
        const signatureAlgorithm = this.signature.algorithm;
        const cryptAlgorithm = this.crypto.algorithm;
        const signatureKey = await this.signature.exports(verifyOnly);
        const cryptoKey = await this.crypto.exports();
        return `${cid}.${datIssuanceStartSeconds}.${datIssuanceDurationSeconds}.${datTtlSeconds}.${signatureAlgorithm}.${cryptAlgorithm}.${signatureKey}.${cryptoKey}`;
    }

    static async imports(format: string): Promise<DatCertificate> {
        const parts = format.split(".");
        if (parts.length !== 8) {
            throw new Error("Invalid Certificate format");
        }
        const cid = DatInteger.toCid(parts[0], `Invalid cid(Certificate ID) is HEX ${parts[0]}`);
        const datIssuanceStartSeconds = DatInteger.toBigInt(parts[1]);
        const datIssuanceDurationSeconds = DatInteger.toBigInt(parts[2]);
        const datTtlSeconds = DatInteger.toBigInt(parts[3]);
        const signatureAlgorithm = parts[4];
        const cryptAlgorithm = parts[5];
        const signatureKey = await DatSignature.imports(signatureAlgorithm, parts[6]);
        const cryptoKey = await DatCrypto.imports(cryptAlgorithm, parts[7]);
        
        return new DatCertificate(cid, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds, signatureKey, cryptoKey);
    }

    issuable(): boolean {
        return this.signable() && Unixtime.now().between(this.datIssuanceStartSeconds, this.datIssuanceEndSeconds, true);
    }

    expired(): boolean {
        return Unixtime.now().after(this.datIssuanceEndSeconds + this.datTtlSeconds, true);
    }

    signable(): boolean {
        return this.signature.signable();
    }

    pair(): boolean {
        return this.signature.pair();
    }

    supportVerifyOnly(): boolean {
        return this.signature.supportVerifyOnly();
    }
}
