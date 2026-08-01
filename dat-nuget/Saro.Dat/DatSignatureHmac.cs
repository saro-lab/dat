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
            // 예전에는 ECDSA 와 HMAC 의 키 크기 오류가 **완전 동일 문구**였다.
            // 코드는 같되(KEY_INVALID) detail 로 어느 쪽인지 구분한다.
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
        // Checked outside the catch: a disposed key must not read as "signature
        // did not match".
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
            // 예전에는 여기 catch-all 이 false 를 돌려줘 **프로그래밍 오류를 서명
            // 불일치로 위장**했다. 잘못된 키 타입·손상된 핸들·라이브러리 버그가
            // 전부 위조 시도로 보고되던 자리다.
            throw new DatException(DatErrorCode.SigBackend, "hmac verification failed to run", e);
        }
    }

    public byte[] ExportKey(bool verifyOnly = false)
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureHmac));
        if (verifyOnly)
        {
            // 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
            throw new DatException(DatErrorCode.KeyVerifyOnlyUnsupported, _algorithm.ToText());
        }
        // A copy, not the live key: DatCryptoAesGcmNonce.ToBytes does the same.
        // Handing out _key lets a caller mutate the signing key in place.
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
