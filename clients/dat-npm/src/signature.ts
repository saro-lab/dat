import {DatArrayBuffer, DatUint8Array,} from "./index.js";

export type DatSignatureAlgorithm =
    "HMAC-SHA256-MFS" | "HMAC-SHA384-MFS" | "HMAC-SHA512-MFS" |
    "ECDSA-P256" | "ECDSA-P384" | "ECDSA-P521";

export const DatSignatureAlgorithms: DatSignatureAlgorithm[] = [
    "HMAC-SHA256-MFS", "HMAC-SHA384-MFS", "HMAC-SHA512-MFS",
    "ECDSA-P256", "ECDSA-P384", "ECDSA-P521"
];

type SignatureConfig = {
    name: string;
    hash: { name: string };
    namedCurve?: string;
    privateLen?: number;
    publicLen?: number;
    hmacLen?: number;
};

const SIGNATURE_CONFIG: Record<string, SignatureConfig> = {
    "HMAC-SHA256-MFS": { name: "HMAC", hash: { name: "SHA-256" }, hmacLen: 32 },
    "HMAC-SHA384-MFS": { name: "HMAC", hash: { name: "SHA-384" }, hmacLen: 48 },
    "HMAC-SHA512-MFS": { name: "HMAC", hash: { name: "SHA-512" }, hmacLen: 64 },
    "ECDSA-P256": { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" }, privateLen: 32, publicLen: 65 },
    "ECDSA-P384": { name: "ECDSA", namedCurve: "P-384", hash: { name: "SHA-384" }, privateLen: 48, publicLen: 97 },
    "ECDSA-P521": { name: "ECDSA", namedCurve: "P-521", hash: { name: "SHA-512" }, privateLen: 66, publicLen: 133 },
};

function getCryptoConfig(algorithm: string): SignatureConfig {
    const config = SIGNATURE_CONFIG[algorithm];
    if (config) {
        return config;
    }
    throw new Error(`Unsupported DAT Signature Algorithm: ${algorithm}`);
}

export class DatSignature {
    private readonly config: SignatureConfig;
    public readonly algorithm: DatSignatureAlgorithm;
    private readonly signingKey: CryptoKey | null;
    private readonly verifyingKey: CryptoKey;

    constructor(
        algorithm: DatSignatureAlgorithm,
        signingKey: CryptoKey | null,
        verifyingKey: CryptoKey,
        config: SignatureConfig = getCryptoConfig(algorithm),
    ) {
        this.algorithm = algorithm;
        this.signingKey = signingKey;
        this.verifyingKey = verifyingKey;
        this.config = config;
    }

    static async generate(algorithm: DatSignatureAlgorithm): Promise<DatSignature> {
        const config = getCryptoConfig(algorithm);
        if (config.name === "HMAC") {
            const key = await crypto.subtle.generateKey(
                { name: "HMAC", hash: config.hash, length: config.hmacLen! * 8 },
                true,
                ["sign", "verify"]
            );
            return new DatSignature(algorithm, key, key, config);
        } else {
            const { publicKey, privateKey } = await crypto.subtle.generateKey(
                { name: "ECDSA", namedCurve: config.namedCurve! },
                true,
                ["sign", "verify"]
            );
            return new DatSignature(algorithm, privateKey, publicKey, config);
        }
    }

    static async imports(algorithm: string, base64: string): Promise<DatSignature> {
        const config = getCryptoConfig(algorithm);
        const bytes = DatUint8Array.fromBase64Url(base64);

        if (config.name === "HMAC") {
            if (bytes.length !== config.hmacLen) {
                throw new Error(`Invalid HMAC key length: expected ${config.hmacLen}, got ${bytes.length}`);
            }
            const key = await crypto.subtle.importKey(
                "raw", bytes,
                { name: "HMAC", hash: config.hash },
                true,
                ["sign", "verify"]
            );
            return new DatSignature(algorithm as DatSignatureAlgorithm, key, key, config);
        } else {
            const privateLen = config.privateLen!;
            const publicLen = config.publicLen!;

            let signingKey: CryptoKey | null = null;
            let verifyingKey: CryptoKey;

            if (bytes.length === privateLen + publicLen) {
                const privateBytes = bytes.slice(0, privateLen);
                const publicBytes = bytes.slice(privateLen);

                // Import public key
                verifyingKey = await crypto.subtle.importKey(
                    "raw", publicBytes,
                    { name: "ECDSA", namedCurve: config.namedCurve! },
                    true,
                    ["verify"]
                );

                // Import private key using JWK to include X, Y from publicBytes
                // uncompressed point format: 0x04 || X || Y
                const xBytes = publicBytes.slice(1, 1 + (publicLen - 1) / 2);
                const yBytes = publicBytes.slice(1 + (publicLen - 1) / 2);

                const jwk = {
                    kty: "EC",
                    crv: config.namedCurve,
                    d: DatUint8Array.toBase64Url(privateBytes),
                    x: DatUint8Array.toBase64Url(xBytes),
                    y: DatUint8Array.toBase64Url(yBytes),
                    ext: true,
                };

                signingKey = await crypto.subtle.importKey(
                    "jwk", jwk,
                    { name: "ECDSA", namedCurve: config.namedCurve! },
                    true,
                    ["sign"]
                );
            } else if (bytes.length === publicLen) {
                verifyingKey = await crypto.subtle.importKey(
                    "raw", bytes,
                    { name: "ECDSA", namedCurve: config.namedCurve! },
                    true,
                    ["verify"]
                );
            } else {
                throw new Error(`Invalid ECDSA key length`);
            }

            return new DatSignature(algorithm as DatSignatureAlgorithm, signingKey, verifyingKey, config);
        }
    }

    async exports(verifyOnly: boolean = false): Promise<string> {
        if (verifyOnly && !this.supportVerifyOnly()) {
            throw new Error(`${this.config.name} is not supported - verifyOnly`);
        }
        if (this.config.name === "HMAC") {
            const bytes = await crypto.subtle.exportKey("raw", this.verifyingKey);
            return DatArrayBuffer.toBase64Url(bytes);
        } else {
            if (verifyOnly || !this.signingKey) {
                const bytes = await crypto.subtle.exportKey("raw", this.verifyingKey);
                return DatArrayBuffer.toBase64Url(bytes);
            } else {
                // Export private (raw) + public (raw uncompressed)
                const jwk = await crypto.subtle.exportKey("jwk", this.signingKey);
                const key = DatArrayBuffer.concat(DatArrayBuffer.fromBase64Url(jwk.d!), await crypto.subtle.exportKey("raw", this.verifyingKey))
                return DatArrayBuffer.toBase64Url(key);
            }
        }
    }

    async sign(body: ArrayBufferLike | Uint8Array | string | null | undefined): Promise<ArrayBuffer> {
        if (!this.signingKey) {
            throw new Error(`Signature key is not supported - verifying only key`);
        }
        const bytes = DatArrayBuffer.from(body);
        if (!bytes.byteLength) {
            throw new Error(`Sign Error - body is empty`);
        }
        if (this.config.name === "HMAC") {
            return crypto.subtle.sign(
                { name: "HMAC" },
                this.signingKey, bytes
            );
        } else {
            return crypto.subtle.sign(
                { name: "ECDSA", hash: this.config.hash },
                this.signingKey, bytes
            );
        }
    }

    async verify(body: ArrayBufferLike | Uint8Array | string | null | undefined, signature: ArrayBufferLike | Uint8Array | string | null | undefined): Promise<boolean> {
        const bodyBytes = DatArrayBuffer.from(body);
        if (!bodyBytes.byteLength) {
            return false;
        }
        const sigBytes = DatArrayBuffer.fromBase64Url(signature);
        if (this.config.name === "HMAC") {
            return crypto.subtle.verify(
                { name: "HMAC" },
                this.verifyingKey,
                sigBytes, bodyBytes
            );
        } else {
            return crypto.subtle.verify(
                { name: "ECDSA", hash: this.config.hash },
                this.verifyingKey,
                sigBytes, bodyBytes
            );
        }
    }

    signable(): boolean {
        return this.signingKey !== null;
    }

    pair(): boolean {
        return this.config.name === "ECDSA";
    }

    supportVerifyOnly(): boolean {
        return this.pair();
    }
}
