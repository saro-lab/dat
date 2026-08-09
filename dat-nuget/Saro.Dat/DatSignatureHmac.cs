using System.Security.Cryptography;

namespace Saro.Dat;

public class DatSignatureHmac : IDatSignature, IDisposable
{
    private readonly DatSignatureAlgorithm _algorithm;
    private readonly byte[] _key;
    private bool _disposed;

    private DatSignatureHmac(DatSignatureAlgorithm algorithm, byte[] key)
    {
        _algorithm = algorithm;
        _key = key;
    }

    public static IDatSignature FromKey(DatSignatureAlgorithm algorithm, byte[] key)
    {
        if (key is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "signature key bytes are null");
        if (GetKeySize(algorithm) != key.Length)
        {
            throw new DatException(DatErrorCode.KeyInvalid,
                $"hmac key must be {GetKeySize(algorithm)} bytes for {algorithm.ToText()}, got {key.Length}");
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
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"not an hmac signature algorithm: {algorithm}")
    };

    public DatSignatureAlgorithm Algorithm() => _algorithm;

    public byte[] Sign(byte[] body) => _disposed ? throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureHmac)) : _algorithm switch
    {
        DatSignatureAlgorithm.HmacSha256Mfs => HMACSHA256.HashData(_key, body),
        DatSignatureAlgorithm.HmacSha384Mfs => HMACSHA384.HashData(_key, body),
        DatSignatureAlgorithm.HmacSha512Mfs => HMACSHA512.HashData(_key, body),
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"not an hmac signature algorithm: {_algorithm}")
    };

    public bool Verify(byte[] body, byte[] signature)
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureHmac));
        try
        {
            byte[] computed = Sign(body);
            return CryptographicOperations.FixedTimeEquals(computed, signature);
        }
        catch (DatException)
        {
            throw;
        }
        catch (Exception e)
        {
            throw new DatException(DatErrorCode.SigBackend, "hmac verification failed to run", e);
        }
    }

    public byte[] ExportKey(bool verifyOnly = false)
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureHmac));
        if (verifyOnly)
        {
            throw new DatException(DatErrorCode.KeyVerifyOnlyUnsupported, _algorithm.ToText());
        }
        return (byte[])_key.Clone();
    }

    public bool Signable() => true;

    public bool SupportVerifyOnly() => false;

    public object Clone()
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureHmac));
        return new DatSignatureHmac(_algorithm, (byte[])_key.Clone());
    }

    IDatSignature IDatSignature.Clone() => (IDatSignature)Clone();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        CryptographicOperations.ZeroMemory(_key);
    }
}
