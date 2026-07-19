using System.Text;

namespace Saro.Dat.Tests;

public class CryptoTest
{
    private void Unit(DatCryptoAlgorithm alg)
    {
        var body = Encoding.UTF8.GetBytes(DatUtils.GenerateRandomBase62(100));
        var cryptoKey = IDatCrypto.Generate(alg);
        var cryptoKeyFail = IDatCrypto.Generate(alg);
        var cryptoKeyBytes = cryptoKey.ToBytes();
        var cryptoKeyFrom = IDatCrypto.FromBytes(alg, cryptoKeyBytes);

        var encrypted = cryptoKeyFrom.Encrypt(body);

        Assert.That(cryptoKey.Decrypt(encrypted), Is.EqualTo(body));
        Assert.That(cryptoKeyFrom.Decrypt(encrypted), Is.EqualTo(body));
        Assert.That(() => cryptoKeyFail.Decrypt(encrypted), Throws.Exception);
    }

    [Test]
    public void Test()
    {
        foreach (DatCryptoAlgorithm algorithm in Enum.GetValues<DatCryptoAlgorithm>())
        {
            TestContext.Progress.WriteLine($"crypto test - {algorithm.ToText()}");
            for (int i = 0; i < 20; i++)
            {
                Unit(algorithm);
            }
        }
    }
}
