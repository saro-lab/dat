using System.Text;

namespace Saro.Dat.Tests;

public class CertificateTest
{
    public void Unit(DatCertificate failCert, DatSignatureAlgorithm signatureAlgorithm, DatCryptoAlgorithm cryptoAlgorithm)
    {
        string tag = signatureAlgorithm.ToText() + " " + cryptoAlgorithm.ToText();

        string plain = DatUtils.GenerateRandomBase62(30);
        string secure = DatUtils.GenerateRandomBase62(30);

        long id = (long)(Random.Shared.NextDouble() * long.MaxValue);

        DatCertificate newCert = Generate(id, signatureAlgorithm, cryptoAlgorithm);
        string newCertStr = newCert.Exports(false);
        DatCertificate readCert = DatCertificate.Parse(newCertStr);
        TestContext.Progress.WriteLine($"{tag} CERT: {newCertStr}");

        string dat = DatManager.Issue(newCert, plain, secure);
        string dat2 = DatManager.Issue(newCert, Encoding.UTF8.GetBytes(plain), Encoding.UTF8.GetBytes(secure));

        TestContext.Progress.WriteLine($"{tag}: {dat}");

        Payload payload = DatManager.Parse(readCert, dat);
        Payload payload2 = DatManager.Parse(readCert, dat2);

        TestContext.Progress.WriteLine($"{tag}: {payload.Plain} / {payload.Secure}");

        Assert.That(payload.Plain, Is.EqualTo(plain));
        Assert.That(payload.Secure, Is.EqualTo(secure));
        Assert.That(payload2.Plain, Is.EqualTo(plain));
        Assert.That(payload2.Secure, Is.EqualTo(secure));
        Assert.That(newCert.Cid, Is.EqualTo(id));
        Assert.That(readCert.Cid, Is.EqualTo(id));

        Assert.Throws<DatException>(() => DatManager.Parse(failCert, dat));
    }

    public DatCertificate Generate(long id, DatSignatureAlgorithm signatureAlgorithm, DatCryptoAlgorithm cryptoAlgorithm)
    {
        long now = Unixtime.Now();
        return DatCertificate.Generate(
            id,
            now - 10,
            600,
            60,
            signatureAlgorithm,
            cryptoAlgorithm
        );
    }

    [Test]
    public void Test()
    {
        var failCert = Generate((long)(Random.Shared.NextDouble() * long.MaxValue), DatSignatureAlgorithm.EcdsaP256, DatCryptoAlgorithm.IvAes128Gcm);

        foreach (DatSignatureAlgorithm signatureAlgorithm in Enum.GetValues<DatSignatureAlgorithm>())
        {
            foreach (DatCryptoAlgorithm cryptoAlgorithm in Enum.GetValues<DatCryptoAlgorithm>())
            {
                for (int i = 0; i < 20; i++)
                {
                    Unit(failCert, signatureAlgorithm, cryptoAlgorithm);
                }
            }
        }
    }
}
