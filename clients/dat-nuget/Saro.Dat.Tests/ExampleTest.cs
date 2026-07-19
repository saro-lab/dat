namespace Saro.Dat.Tests;

[TestFixture]
public class ExampleTest
{
    [Test]
    public void TestIssueAndParse()
    {
        var datManager = DatManager.NewInstance();

        long now = Unixtime.Now();
        var cert = DatCertificate.Generate(
            0,
            now - 10,
            7200,
            1800,
            DatSignatureAlgorithm.EcdsaP256,
            DatCryptoAlgorithm.IvAes128Gcm
        );

        datManager.Imports(new List<DatCertificate> { cert }, false);

        string plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
        string secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

        string dat = datManager.Issue(plain, secure);

        Payload payload = datManager.Parse(dat);

        Assert.That(payload.Plain, Is.EqualTo(plain));
        Assert.That(payload.Secure, Is.EqualTo(secure));

        TestContext.Progress.WriteLine($"PARSE DAT: {dat}");
        TestContext.Progress.WriteLine($"plain: {payload.Plain}");
        TestContext.Progress.WriteLine($"secure: {payload.Secure}");
    }
}
