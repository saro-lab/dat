import {DatArrayBuffer,} from "./index.js";

export type DatCryptoAlgorithm = "IV-AES128-GCM" | "IV-AES256-GCM";
export const DatCryptoAlgorithms: DatCryptoAlgorithm[] = ["IV-AES128-GCM", "IV-AES256-GCM"];

type CryptoConfig = { name: string; length: number };

const CRYPTO_CONFIG: Record<string, CryptoConfig> = {
    "IV-AES128-GCM": { name: "AES-GCM", length: 128 },
    "IV-AES256-GCM": { name: "AES-GCM", length: 256 },
};

function getCryptoConfig(algorithm: string): CryptoConfig {
    const config = CRYPTO_CONFIG[algorithm];
    if (config) {
        return config;
    }
    throw new Error(`Unsupported DAT Crypto Algorithm: ${algorithm}`);
}

export class DatCrypto {
    private readonly config: CryptoConfig;
    public readonly algorithm: DatCryptoAlgorithm;
    public readonly key: CryptoKey;

    constructor(
        algorithm: DatCryptoAlgorithm,
        key: CryptoKey,
        config: CryptoConfig = getCryptoConfig(algorithm),
    ) {
        this.algorithm = algorithm;
        this.key = key;
        this.config = config;
    }

    static async generate(algorithm: DatCryptoAlgorithm): Promise<DatCrypto> {
        const config = getCryptoConfig(algorithm);
        const key = await crypto.subtle.generateKey(
            { name: config.name, length: config.length }, true, ["encrypt", "decrypt"]
        );
        return new DatCrypto(algorithm, key, config);
    }

    static async imports(algorithm: string, base64: string): Promise<DatCrypto> {
        const config = getCryptoConfig(algorithm);
        const bytes = DatArrayBuffer.fromBase64Url(base64)
        const key = await crypto.subtle.importKey(
            "raw", bytes, { name: config.name }, true, ["encrypt", "decrypt"]
        );
        return new DatCrypto(algorithm as DatCryptoAlgorithm, key, config);
    }

    async exports(): Promise<string> {
        return DatArrayBuffer.toBase64Url(await crypto.subtle.exportKey("raw", this.key))
    }

    async encrypt(data: ArrayBufferLike|Uint8Array|string|null|undefined): Promise<ArrayBuffer> {
        const buffer = DatArrayBuffer.from(data);
        if (!buffer.byteLength) {
            return buffer;
        }

        if (this.config.name == "AES-GCM") {
            const nonce = new Uint8Array(12);
            crypto.getRandomValues(nonce);
            const encrypt = await crypto.subtle.encrypt(
                { name: this.config.name, iv: nonce }, this.key, buffer
            );
            return DatArrayBuffer.concat(nonce, encrypt);
        }
        throw new Error(`Unsupported DAT Crypto Algorithm: ${this.algorithm}`);
    }

    async decrypt(data: ArrayBufferLike|Uint8Array|string|null|undefined): Promise<ArrayBuffer> {
        const buffer: ArrayBuffer = DatArrayBuffer.fromBase64Url(data);
        if (!buffer.byteLength) {
            return buffer;
        }
        if (this.config.name == "AES-GCM") {
            if (buffer.byteLength <= 12) {
                throw new Error("Invalid data length");
            }
            const bytes = new Uint8Array(buffer);
            return await crypto.subtle.decrypt(
                { name: this.config.name, iv: bytes.subarray(0, 12) }, this.key, bytes.subarray(12)
            );
        }
        throw new Error(`Unsupported DAT Crypto Algorithm: ${this.algorithm}`);
    }
}
