namespace Saro.Dat;

public interface IDatCrypto : ICloneable
{
    DatCryptoAlgorithm Algorithm();
    byte[] ToBytes();
    byte[] Encrypt(byte[] bytes);
    byte[] Decrypt(byte[] bytes);
    new IDatCrypto Clone();

    public static IDatCrypto FromBytes(DatCryptoAlgorithm algorithm, byte[] bytes)
    {
        return algorithm switch
        {
            DatCryptoAlgorithm.IvAes128Gcm or DatCryptoAlgorithm.IvAes256Gcm
                => DatCryptoAesGcmNonce.FromBytes(algorithm, bytes),
            _ => throw new NotSupportedException($"{algorithm} is not supported")
        };
    }

    public static IDatCrypto Generate(DatCryptoAlgorithm algorithm)
    {
        return algorithm switch
        {
            DatCryptoAlgorithm.IvAes128Gcm or DatCryptoAlgorithm.IvAes256Gcm
                => DatCryptoAesGcmNonce.Generate(algorithm),
            _ => throw new NotSupportedException($"{algorithm} is not supported")
        };
    }
}
