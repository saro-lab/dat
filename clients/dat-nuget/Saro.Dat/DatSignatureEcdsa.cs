using System.Security.Cryptography;

namespace Saro.Dat;

public class DatSignatureEcdsa : IDatSignature
{
    private readonly DatSignatureAlgorithm _algorithm;
    private readonly ECDsa _ecdsa;
    private readonly bool _hasPrivate;

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
            throw new DatException($"Invalid Dat Signature Key Size: {alg} {key.Length}");
        }

        // 공개키 복원 (Uncompressed 포맷 04 + X + Y 처리)
        int coordSize = GetCoordSize(alg);
        if (pubKeyBytes[0] != 0x04) throw new DatException("Invalid Public Key Format (Must be uncompressed 0x04)");

        parameters.Q = new ECPoint
        {
            X = pubKeyBytes[1..(1 + coordSize)],
            Y = pubKeyBytes[(1 + coordSize)..]
        };
        ecdsa.ImportParameters(parameters);

        return new DatSignatureEcdsa(alg, ecdsa, hasPrivate);
    }

    public byte[] Sign(byte[] body) => _hasPrivate ? _ecdsa.SignData(body, GetHashName(_algorithm), DSASignatureFormat.IeeeP1363FixedFieldConcatenation) : throw new DatException("VerifyingKey Only Key: Is not Have Signing Key");

    public bool Verify(byte[] body, byte[] signature) => _ecdsa.VerifyData(body, signature, GetHashName(_algorithm), DSASignatureFormat.IeeeP1363FixedFieldConcatenation);

    public byte[] ExportKey(bool verifyOnly = false)
    {
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
        _ => throw new ArgumentException($"Unsupported ECDSA algorithm: {alg}")
    };

    private static HashAlgorithmName GetHashName(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => HashAlgorithmName.SHA256,
        DatSignatureAlgorithm.EcdsaP384 => HashAlgorithmName.SHA384,
        DatSignatureAlgorithm.EcdsaP521 => HashAlgorithmName.SHA512,
        _ => throw new ArgumentException($"Unsupported ECDSA algorithm: {alg}")
    };

    private static int GetPrivateKeySize(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => 32,
        DatSignatureAlgorithm.EcdsaP384 => 48,
        DatSignatureAlgorithm.EcdsaP521 => 66,
        _ => throw new ArgumentException($"Unsupported ECDSA algorithm: {alg}")
    };

    private static int GetPublicKeySize(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => 65,
        DatSignatureAlgorithm.EcdsaP384 => 97,
        DatSignatureAlgorithm.EcdsaP521 => 133,
        _ => throw new ArgumentException($"Unsupported ECDSA algorithm: {alg}")
    };

    private static int GetCoordSize(DatSignatureAlgorithm alg) => alg switch
    {
        DatSignatureAlgorithm.EcdsaP256 => 32,
        DatSignatureAlgorithm.EcdsaP384 => 48,
        DatSignatureAlgorithm.EcdsaP521 => 66,
        _ => throw new ArgumentException($"Unsupported ECDSA algorithm: {alg}")
    };

    public DatSignatureAlgorithm Algorithm() => _algorithm;
    public bool Signable() => _hasPrivate;
    public bool SupportVerifyOnly() => true;
    public object Clone() => FromKey(_algorithm, ExportKey());
    IDatSignature IDatSignature.Clone() => (IDatSignature)Clone();
}

