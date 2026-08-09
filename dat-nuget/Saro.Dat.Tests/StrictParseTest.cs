namespace Saro.Dat.Tests;

public class StrictParseTest
{
    private static DatCertificate Generate() => DatCertificate.Generate(
        0x1f, Unixtime.Now() - 10, 600, 60,
        DatSignatureAlgorithm.EcdsaP256, DatCryptoAlgorithm.IvAes256Gcm);

    private static string Mutate(string joined, int index, string value)
    {
        var parts = joined.Split('.');
        parts[index] = value;
        return string.Join('.', parts);
    }

    [TestCase(" ")]
    [TestCase("+")]
    public void DatExpireRejectsNonDigits(string prefix)
    {
        using var cert = Generate();
        string dat = DatManager.Issue(cert, "plain", "secure");
        string expire = dat.Split('.')[0];

        Assert.Throws<DatException>(() => new Dat(Mutate(dat, 0, prefix + expire)));
    }

    [Test]
    public void DatExpireRejectsNegative()
    {
        using var cert = Generate();
        string dat = DatManager.Issue(cert, "plain", "secure");

        Assert.Throws<DatException>(() => new Dat(Mutate(dat, 0, "-1")));
    }

    [Test]
    public void DatCidRejectsHexPrefix()
    {
        using var cert = Generate();
        string dat = DatManager.Issue(cert, "plain", "secure");
        string cid = dat.Split('.')[1];

        Assert.Throws<DatException>(() => new Dat(Mutate(dat, 1, "0x" + cid)));
    }

    [Test]
    public void DatStillParsesUnmutated()
    {
        using var cert = Generate();
        string dat = DatManager.Issue(cert, "plain", "secure");

        var payload = DatManager.Parse(cert, new Dat(dat));

        Assert.That(payload.Plain, Is.EqualTo("plain"));
        Assert.That(payload.Secure, Is.EqualTo("secure"));
    }

    [TestCase(1, " 100")]
    [TestCase(1, "+100")]
    [TestCase(2, "-1")]
    [TestCase(3, "6 0")]
    public void CertificateFieldsRejectNonDigits(int index, string value)
    {
        using var cert = Generate();
        string exported = cert.Exports(false);

        Assert.Throws<DatException>(() => DatCertificate.Parse(Mutate(exported, index, value)));
    }

    [Test]
    public void CertificateCidRejectsHexPrefix()
    {
        using var cert = Generate();
        string exported = cert.Exports(false);

        Assert.Throws<DatException>(() => DatCertificate.Parse(Mutate(exported, 0, "0x1f")));
    }

    [Test]
    public void CertificateRoundTripsUnmutated()
    {
        using var cert = Generate();

        using var parsed = DatCertificate.Parse(cert.Exports(false));

        Assert.That(parsed.Cid, Is.EqualTo(cert.Cid));
        Assert.That(parsed.DatIssuanceStartSeconds, Is.EqualTo(cert.DatIssuanceStartSeconds));
        Assert.That(parsed.DatIssuanceEndSeconds, Is.EqualTo(cert.DatIssuanceEndSeconds));
        Assert.That(parsed.DatTtlSeconds, Is.EqualTo(cert.DatTtlSeconds));
    }
}
