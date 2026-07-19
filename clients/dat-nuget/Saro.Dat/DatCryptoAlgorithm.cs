namespace Saro.Dat;

public enum DatCryptoAlgorithm
{
    IvAes128Gcm,
    IvAes256Gcm
}

public static class DatCryptoAlgorithmExtensions
{
    public static string ToText(this DatCryptoAlgorithm algorithm) => algorithm switch
    {
        DatCryptoAlgorithm.IvAes128Gcm => "IV-AES128-GCM",
        DatCryptoAlgorithm.IvAes256Gcm => "IV-AES256-GCM",
        _ => throw new ArgumentOutOfRangeException(nameof(algorithm))
    };

    public static DatCryptoAlgorithm FromText(string text) => text switch
    {
        "IV-AES128-GCM" => DatCryptoAlgorithm.IvAes128Gcm,
        "IV-AES256-GCM" => DatCryptoAlgorithm.IvAes256Gcm,
        _ => throw new ArgumentException($"Unknown crypto algorithm: {text}")
    };
}
