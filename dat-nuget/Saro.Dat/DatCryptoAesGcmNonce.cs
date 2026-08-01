using System.Security.Cryptography;

namespace Saro.Dat;

public class DatCryptoAesGcmNonce : IDatCrypto, IDisposable
{
    private readonly DatCryptoAlgorithm _algorithm;
    private readonly byte[] _key;
    private bool _disposed;
    private const int NonceLen = 12;
    private const int TagLen = 16;

    private DatCryptoAesGcmNonce(DatCryptoAlgorithm algorithm, byte[] key)
    {
        _algorithm = algorithm;
        _key = key;
    }

    public static IDatCrypto FromBytes(DatCryptoAlgorithm alg, byte[] bytes)
    {
        if (bytes is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "crypto key bytes are null");
        if (bytes.Length != GetKeySize(alg))
        {
            throw new DatException(DatErrorCode.KeyInvalid,
                $"{alg.ToText()} key must be {GetKeySize(alg)} bytes, got {bytes.Length}");
        }
        return new DatCryptoAesGcmNonce(alg, bytes);
    }

    public static IDatCrypto Generate(DatCryptoAlgorithm alg)
    {
        byte[] key = new byte[GetKeySize(alg)];
        RandomNumberGenerator.Fill(key);
        return new DatCryptoAesGcmNonce(alg, key);
    }

    private static int GetKeySize(DatCryptoAlgorithm alg) => alg switch
    {
        DatCryptoAlgorithm.IvAes128Gcm => 16,
        DatCryptoAlgorithm.IvAes256Gcm => 32,
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"unknown crypto algorithm: {alg}")
    };

    public byte[] Encrypt(byte[] bytes)
    {
        // 예전에는 crypto 쪽만 _disposed 를 보지 않아, Dispose 된 인증서가
        // "서명은 죽고 복호화는 살아있는" 상태로 남았다. 서명과 같은 코드로 맞춘다.
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatCryptoAesGcmNonce));
        if (bytes is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "payload to encrypt is null");
        if (bytes.Length == 0) return [];

        byte[] result = new byte[NonceLen + bytes.Length + TagLen];
        Span<byte> nonce = result.AsSpan(0, NonceLen);
        RandomNumberGenerator.Fill(nonce);

        using var aes = new AesGcm(_key, TagLen);
        try
        {
            aes.Encrypt(nonce, bytes, result.AsSpan(NonceLen, bytes.Length), result.AsSpan(NonceLen + bytes.Length, TagLen));
        }
        catch (CryptographicException e)
        {
            throw new DatException(DatErrorCode.CryptoBackend, "aes-gcm encrypt failed", e);
        }
        return result;
    }

    public byte[] Decrypt(byte[] bytes)
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatCryptoAesGcmNonce));
        if (bytes is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "ciphertext is null");
        if (bytes.Length == 0) return [];
        if (bytes.Length < NonceLen + TagLen)
            throw new DatException(DatErrorCode.CryptoDataInvalid,
                $"ciphertext must be at least {NonceLen + TagLen} bytes (iv + tag), got {bytes.Length}");

        byte[] plaintext = new byte[bytes.Length - NonceLen - TagLen];

        using var aes = new AesGcm(_key, TagLen);
        try
        {
            aes.Decrypt(
                bytes.AsSpan(0, NonceLen),
                bytes.AsSpan(NonceLen, plaintext.Length),
                bytes.AsSpan(bytes.Length - TagLen, TagLen),
                plaintext);
        }
        catch (AuthenticationTagMismatchException e)
        {
            // 예전에는 이 예외가 DatException 우산 밖으로 그대로 새어 나갔다.
            // ParseWithoutVerifying 경로에서는 이것이 유일한 무결성 검사다 —
            // 변조된 secure 이거나 잘못된 인증서 키라는 뜻이다.
            throw new DatException(DatErrorCode.CryptoTagMismatch, "gcm authentication tag mismatch", e);
        }
        catch (CryptographicException e)
        {
            // 태그 불일치가 아닌 백엔드 실패. 보안 이벤트로 오인하면 안 된다.
            throw new DatException(DatErrorCode.CryptoBackend, "aes-gcm decrypt failed", e);
        }
        return plaintext;
    }

    public DatCryptoAlgorithm Algorithm() => _algorithm;

    public byte[] ToBytes()
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatCryptoAesGcmNonce));
        return (byte[])_key.Clone();
    }

    public object Clone()
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatCryptoAesGcmNonce));
        return new DatCryptoAesGcmNonce(_algorithm, (byte[])_key.Clone());
    }

    IDatCrypto IDatCrypto.Clone() => (IDatCrypto)Clone();

    /// <summary>
    /// 키 재료를 소거한다. DatCertificate.Dispose 가 서명 키와 함께 호출하므로,
    /// 해제 뒤에는 서명도 복호화도 같은 코드로 거부된다.
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        CryptographicOperations.ZeroMemory(_key);
    }
}
