namespace Saro.Dat;

public enum DatSignatureAlgorithm
{
    HmacSha256Mfs,
    HmacSha384Mfs,
    HmacSha512Mfs,
    EcdsaP256,
    EcdsaP384,
    EcdsaP521,
}

public static class DatSignatureAlgorithmExtensions
{
    public static string ToText(this DatSignatureAlgorithm algorithm) => algorithm switch
    {
        DatSignatureAlgorithm.HmacSha256Mfs => "HMAC-SHA256-MFS",
        DatSignatureAlgorithm.HmacSha384Mfs => "HMAC-SHA384-MFS",
        DatSignatureAlgorithm.HmacSha512Mfs => "HMAC-SHA512-MFS",
        DatSignatureAlgorithm.EcdsaP256 => "ECDSA-P256",
        DatSignatureAlgorithm.EcdsaP384 => "ECDSA-P384",
        DatSignatureAlgorithm.EcdsaP521 => "ECDSA-P521",
        _ => throw new ArgumentOutOfRangeException(nameof(algorithm))
    };

    public static DatSignatureAlgorithm FromText(string text) => text switch
    {
        "HMAC-SHA256-MFS" => DatSignatureAlgorithm.HmacSha256Mfs,
        "HMAC-SHA384-MFS" => DatSignatureAlgorithm.HmacSha384Mfs,
        "HMAC-SHA512-MFS" => DatSignatureAlgorithm.HmacSha512Mfs,
        "ECDSA-P256" => DatSignatureAlgorithm.EcdsaP256,
        "ECDSA-P384" => DatSignatureAlgorithm.EcdsaP384,
        "ECDSA-P521" => DatSignatureAlgorithm.EcdsaP521,
        _ => throw new ArgumentException($"Unknown signature algorithm: {text}")
    };
}
