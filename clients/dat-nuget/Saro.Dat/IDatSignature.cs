namespace Saro.Dat;

public interface IDatSignature : ICloneable
{
    DatSignatureAlgorithm Algorithm();
    bool Verify(byte[] body, byte[] signature);
    byte[] Sign(byte[] body);
    byte[] ExportKey(bool verifyOnly = false);
    bool Signable();
    bool SupportVerifyOnly();
    new IDatSignature Clone();

    public static IDatSignature FromKey(DatSignatureAlgorithm algorithm, byte[] key)
    {
        return algorithm switch
        {
            DatSignatureAlgorithm.EcdsaP256 or DatSignatureAlgorithm.EcdsaP384 or DatSignatureAlgorithm.EcdsaP521
                => DatSignatureEcdsa.FromKey(algorithm, key),
            DatSignatureAlgorithm.HmacSha256Mfs or DatSignatureAlgorithm.HmacSha384Mfs or DatSignatureAlgorithm.HmacSha512Mfs
                => DatSignatureHmac.FromKey(algorithm, key),
            _ => throw new NotSupportedException($"{algorithm} is not supported")
        };
    }

    public static IDatSignature Generate(DatSignatureAlgorithm algorithm)
    {
        return algorithm switch
        {
            DatSignatureAlgorithm.EcdsaP256 or DatSignatureAlgorithm.EcdsaP384 or DatSignatureAlgorithm.EcdsaP521
                => DatSignatureEcdsa.Generate(algorithm),
            DatSignatureAlgorithm.HmacSha256Mfs or DatSignatureAlgorithm.HmacSha384Mfs or DatSignatureAlgorithm.HmacSha512Mfs
                => DatSignatureHmac.Generate(algorithm),
            _ => throw new NotSupportedException($"{algorithm} is not supported")
        };
    }
}

