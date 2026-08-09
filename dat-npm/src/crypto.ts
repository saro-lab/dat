import {DatArrayBuffer,} from "./index.js";
import {DatError, DatErrorCodes} from "./error.js";

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
    throw new DatError(DatErrorCodes.CONFIG_ALG_UNSUPPORTED, `unknown crypto algorithm: ${algorithm}`);
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
        const keyLength = (key?.algorithm as AesKeyAlgorithm|undefined)?.length;
        if (typeof keyLength === 'number' && keyLength !== config.length) {
            throw new DatError(DatErrorCodes.KEY_INVALID, `${algorithm} key must be ${config.length / 8} bytes, got ${keyLength / 8}`);
        }
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
        if (bytes.byteLength * 8 !== config.length) {
            throw new DatError(DatErrorCodes.KEY_INVALID, `${algorithm} key must be ${config.length / 8} bytes, got ${bytes.byteLength}`);
        }
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
            let encrypt: ArrayBuffer;
            try {
                encrypt = await crypto.subtle.encrypt(
                    { name: this.config.name, iv: nonce }, this.key, buffer
                );
            } catch (e) {
                throw new DatError(DatErrorCodes.CRYPTO_BACKEND, "aes-gcm encrypt failed", e);
            }
            return DatArrayBuffer.concat(nonce, encrypt);
        }
        throw new DatError(DatErrorCodes.CONFIG_ALG_UNSUPPORTED, `unknown crypto algorithm: ${this.algorithm}`);
    }

    async decrypt(data: ArrayBufferLike|Uint8Array|string|null|undefined): Promise<ArrayBuffer> {
        const buffer: ArrayBuffer = DatArrayBuffer.fromBase64Url(data);
        if (!buffer.byteLength) {
            return buffer;
        }
        if (this.config.name == "AES-GCM") {
            if (buffer.byteLength <= 12) {
                throw new DatError(DatErrorCodes.CRYPTO_DATA_INVALID, "ciphertext is shorter than the 12-byte iv");
            }
            const bytes = new Uint8Array(buffer);
            try {
                return await crypto.subtle.decrypt(
                    { name: this.config.name, iv: bytes.subarray(0, 12) }, this.key, bytes.subarray(12)
                );
            } catch (e) {
                throw new DatError(DatErrorCodes.CRYPTO_TAG_MISMATCH, "gcm authentication tag mismatch", e);
            }
        }
        throw new DatError(DatErrorCodes.CONFIG_ALG_UNSUPPORTED, `unknown crypto algorithm: ${this.algorithm}`);
    }
}
