using System.Security.Cryptography;

namespace Saro.Dat;

public class DatSignatureEcdsa : IDatSignature, IDisposable
{
    private readonly DatSignatureAlgorithm _algorithm;
    private readonly ECDsa _ecdsa;
    private readonly bool _hasPrivate;
    private bool _disposed;

    private DatSignatureEcdsa(DatSignatureAlgorithm alg, ECDsa ecdsa, bool hasPrivate)
    {
        _algorithm = alg;
        _ecdsa = ecdsa;
        _hasPrivate = hasPrivate;
    }

    public static IDatSignature Generate(DatSignatureAlgorithm alg)
    {
        var curve = GetCurve(alg);
        return new DatSignatureEcdsa(alg, ECDsa.Create(curve), true);
    }

    public static IDatSignature FromKey(DatSignatureAlgorithm alg, byte[] key)
    {
        if (key is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "signature key bytes are null");

        var privateKeySize = GetPrivateKeySize(alg);
        var publicKeySize = GetPublicKeySize(alg);
        var ecdsa = ECDsa.Create();
        var hasPrivate = false;

        ECParameters parameters = new ECParameters { Curve = GetCurve(alg) };

        byte[] pubKeyBytes;
        if (key.Length == privateKeySize + publicKeySize)
        {
            parameters.D = key[..privateKeySize];
            pubKeyBytes = key[privateKeySize..];
            hasPrivate = true;
        }
        else if (key.Length == publicKeySize)
        {
            pubKeyBytes = key;
        }
        else
        {
            ecdsa.Dispose();
            throw new DatException(DatErrorCode.KeyInvalid,
                $"ecdsa key length matches neither private+public ({privateKeySize + publicKeySize}) nor public ({publicKeySize}) for {alg.ToText()}, got {key.Length}");
        }

        // 공개키 복원 (Uncompressed 포맷 04 + X + Y 처리)
        int coordSize = GetCoordSize(alg);
        if (pubKeyBytes[0] != 0x04)
        {
            ecdsa.Dispose();
            throw new DatException(DatErrorCode.KeyInvalid, "ecdsa public key must be an uncompressed point (0x04)");
        }

        parameters.Q = new ECPoint
        {
            X = pubKeyBytes[1..(1 + coordSize)],
            Y = pubKeyBytes[(1 + coordSize)..]
        };
        try
        {
            // 곡선 위에 없는 점, d 가 [1,n-1] 밖, 개인키·공개키 쌍 불일치가 전부 여기서 걸린다.
            ecdsa.ImportParameters(parameters);
        }
        catch (Exception e)
        {
            ecdsa.Dispose();
            throw new DatException(DatErrorCode.KeyInvalid, "ecdsa key material rejected", e);
        }

        return new DatSignatureEcdsa(alg, ecdsa, hasPrivate);
    }

    public byte[] Sign(byte[] body)
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureEcdsa));
        // 런타임에 개인키가 없는 것이다. 알고리즘의 구조적 한계인
        // KEY_VERIFY_ONLY_UNSUPPORTED 와 다르다.
        if (!_hasPrivate) throw new DatException(DatErrorCode.SigKeyMissing, "this key is verify-only");
        try
        {
            return _ecdsa.SignData(body, GetHashName(_algorithm), DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        }
        catch (CryptographicException e)
        {
            throw new DatException(DatErrorCode.SigBackend, "ecdsa sign failed", e);
        }
    }

    public bool Verify(byte[] body, byte[] signature)
    {
        // Thrown, not folded into "false": a disposed key must not read as a
        // signature mismatch.
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureEcdsa));
        try
        {
            return _ecdsa.VerifyData(body, signature, GetHashName(_algorithm), DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        }
        catch (CryptographicException e)
        {
            // 검증 연산 자체가 실패한 것이지 서명이 안 맞는 게 아니다.
            throw new DatException(DatErrorCode.SigBackend, "ecdsa verification failed to run", e);
        }
    }

    public byte[] ExportKey(bool verifyOnly = false)
    {
        if (_disposed) throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatSignatureEcdsa));
        var vo = verifyOnly || !_hasPrivate;
        var parameters = _ecdsa.ExportParameters(!vo);

        byte[] pub = new byte[1 + parameters.Q.X!.Length + parameters.Q.Y!.Length];
        pub[0] = 0x04;
        Buffer.BlockCopy(parameters.Q.X, 0, pub, 1, parameters.Q.X.Length);
        Buffer.BlockCopy(parameters.Q.Y, 0, pub, 1 + parameters.Q.X.Length, parameters.Q.Y.Length);

        if (vo) return pub;

        byte[] priv = parameters.D!;
        int fieldSize = GetPrivateKeySize(_algorithm);

        // Pad or trim private key to field size
        byte[] paddedPriv = new byte[fieldSize];
        if (priv.Length > fieldSize)
        {
            Buffer.BlockCopy(priv, priv.Length - fieldSize, paddedPriv, 0, fieldSize);
        }
        else
        {
            Buffer.BlockCopy(priv, 0, paddedPriv, fieldSize - priv.Length, priv.Length);
        }

        byte[] result = new byte[fieldSize + pub.Length];
        Buffer.BlockCopy(paddedPriv, 0, result, 0, fieldSize);
        Buffer.BlockCopy(pub, 0, result, fieldSize, pub.Length);
        return result;
    }

    private static ECCurve GetCurve(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => ECCurve.NamedCurves.nistP256,
        DatSignatureAlgorithm.EcdsaP384 => ECCurve.NamedCurves.nistP384,
        DatSignatureAlgorithm.EcdsaP521 => ECCurve.NamedCurves.nistP521,
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"not an ecdsa signature algorithm: {alg}")
    };

    private static HashAlgorithmName GetHashName(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => HashAlgorithmName.SHA256,
        DatSignatureAlgorithm.EcdsaP384 => HashAlgorithmName.SHA384,
        DatSignatureAlgorithm.EcdsaP521 => HashAlgorithmName.SHA512,
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"not an ecdsa signature algorithm: {alg}")
    };

    private static int GetPrivateKeySize(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => 32,
        DatSignatureAlgorithm.EcdsaP384 => 48,
        DatSignatureAlgorithm.EcdsaP521 => 66,
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"not an ecdsa signature algorithm: {alg}")
    };

    private static int GetPublicKeySize(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => 65,
        DatSignatureAlgorithm.EcdsaP384 => 97,
        DatSignatureAlgorithm.EcdsaP521 => 133,
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"not an ecdsa signature algorithm: {alg}")
    };

    private static int GetCoordSize(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => 32,
        DatSignatureAlgorithm.EcdsaP384 => 48,
        DatSignatureAlgorithm.EcdsaP521 => 66,
        _ => throw new DatException(DatErrorCode.ConfigAlgUnsupported, $"not an ecdsa signature algorithm: {alg}")
    };

    public DatSignatureAlgorithm Algorithm() => _algorithm;
    public bool Signable() => _hasPrivate;
    public bool SupportVerifyOnly() => true;

    /// <summary>
    /// Produces an independent key holding its own native ECDSA handle. The
    /// caller owns the copy and is responsible for disposing it.
    /// </summary>
    public object Clone() => FromKey(_algorithm, ExportKey());
    IDatSignature IDatSignature.Clone() => (IDatSignature)Clone();

    /// <summary>
    /// Releases the native ECDSA handle. Certificates dispose the keys they own,
    /// so an import loop no longer leaks one handle per refresh.
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _ecdsa.Dispose();
    }
}

