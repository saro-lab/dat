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
            throw new DatException(DatErrorCode.CryptoTagMismatch, "gcm authentication tag mismatch", e);
        }
        catch (CryptographicException e)
        {
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

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        CryptographicOperations.ZeroMemory(_key);
    }
}
