using System.Security.Cryptography;

namespace Saro.Dat;

public class DatSignatureHmac : IDatSignature
{
    private readonly DatSignatureAlgorithm _algorithm;
    private readonly byte[] _key;

    private DatSignatureHmac(DatSignatureAlgorithm algorithm, byte[] key)
    {
        _algorithm = algorithm;
        _key = key;
    }

    public static IDatSignature FromKey(DatSignatureAlgorithm algorithm, byte[] key)
    {
        if (GetKeySize(algorithm) != key.Length)
        {
            throw new DatException($"Invalid Dat Signature Key Size: {algorithm} {key.Length}");
        }
        return new DatSignatureHmac(algorithm, key);
    }

    public static IDatSignature Generate(DatSignatureAlgorithm algorithm)
    {
        byte[] key = new byte[GetKeySize(algorithm)];
        RandomNumberGenerator.Fill(key);
        return new DatSignatureHmac(algorithm, key);
    }

    private static int GetKeySize(DatSignatureAlgorithm algorithm) => algorithm switch
    {
        DatSignatureAlgorithm.HmacSha256Mfs => 32,
        DatSignatureAlgorithm.HmacSha384Mfs => 48,
        DatSignatureAlgorithm.HmacSha512Mfs => 64,
        _ => throw new ArgumentException($"Unsupported HMAC algorithm: {algorithm}")
    };

    public DatSignatureAlgorithm Algorithm() => _algorithm;

    public byte[] Sign(byte[] body) => _algorithm switch
    {
        DatSignatureAlgorithm.HmacSha256Mfs => HMACSHA256.HashData(_key, body),
        DatSignatureAlgorithm.HmacSha384Mfs => HMACSHA384.HashData(_key, body),
        DatSignatureAlgorithm.HmacSha512Mfs => HMACSHA512.HashData(_key, body),
        _ => throw new ArgumentException($"Unsupported HMAC algorithm: {_algorithm}")
    };

    public bool Verify(byte[] body, byte[] signature)
    {
        try
        {
            byte[] computed = Sign(body);
            return CryptographicOperations.FixedTimeEquals(computed, signature);
        }
        catch
        {
            return false;
        }
    }

    public byte[] ExportKey(bool verifyOnly = false)
    {
        if (verifyOnly)
        {
            throw new DatException("Hmac is not supported for verifyOnly");
        }
        return _key;
    }

    public bool Signable() => true;

    public bool SupportVerifyOnly() => false;

    public object Clone() => new DatSignatureHmac(_algorithm, (byte[])_key.Clone());

    IDatSignature IDatSignature.Clone() => (IDatSignature)Clone();
}
