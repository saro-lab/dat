using System.Security.Cryptography;

namespace Saro.Dat;

public class DatCryptoAesGcmNonce : IDatCrypto
{
    private readonly DatCryptoAlgorithm _algorithm;
    private readonly byte[] _key;
    private const int NonceLen = 12;
    private const int TagLen = 16;

    private DatCryptoAesGcmNonce(DatCryptoAlgorithm algorithm, byte[] key)
    {
        _algorithm = algorithm;
        _key = key;
    }

    public static IDatCrypto FromBytes(DatCryptoAlgorithm alg, byte[] bytes)
    {
        if (bytes.Length != GetKeySize(alg))
        {
            throw new DatException($"Invalid {alg} Key Size: {bytes.Length}");
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
        _ => throw new ArgumentException($"Unsupported crypto algorithm: {alg}")
    };

    public byte[] Encrypt(byte[] bytes)
    {
        byte[] result = new byte[NonceLen + bytes.Length + TagLen];
        Span<byte> nonce = result.AsSpan(0, NonceLen);
        RandomNumberGenerator.Fill(nonce);

        using var aes = new AesGcm(_key, TagLen);
        aes.Encrypt(nonce, bytes, result.AsSpan(NonceLen, bytes.Length), result.AsSpan(NonceLen + bytes.Length, TagLen));
        return result;
    }

    public byte[] Decrypt(byte[] bytes)
    {
        if (bytes.Length < NonceLen + TagLen) throw new DatException("Invalid Encrypted Data");

        byte[] plaintext = new byte[bytes.Length - NonceLen - TagLen];

        using var aes = new AesGcm(_key, TagLen);
        aes.Decrypt(
            bytes.AsSpan(0, NonceLen),
            bytes.AsSpan(NonceLen, plaintext.Length),
            bytes.AsSpan(bytes.Length - TagLen, TagLen),
            plaintext);
        return plaintext;
    }

    public DatCryptoAlgorithm Algorithm() => _algorithm;
    public byte[] ToBytes() => (byte[])_key.Clone();
    public object Clone() => new DatCryptoAesGcmNonce(_algorithm, (byte[])_key.Clone());
    IDatCrypto IDatCrypto.Clone() => (IDatCrypto)Clone();
}
