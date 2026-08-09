namespace Saro.Dat.Tests;

public class DisposeTest
{
    private static DatCertificate Generate(long cid) => DatCertificate.Generate(
        cid, Unixtime.Now() - 10, 600, 60,
        DatSignatureAlgorithm.EcdsaP256, DatCryptoAlgorithm.IvAes256Gcm);

    [Test]
    public void ImportCopiesSoTheCallerKeepsOwnership()
    {
        using var cert = Generate(1);
        var manager = DatManager.NewInstance();
        manager.Imports([cert], true);

        manager.Dispose();

        Assert.DoesNotThrow(() => DatManager.Issue(cert, "plain", "secure"));
    }

    [Test]
    public void DisposedManagerRejectsUse()
    {
        using var cert = Generate(1);
        var manager = DatManager.NewInstance();
        manager.Imports([cert], true);
        manager.Dispose();

        Assert.That(Assert.Throws<DatException>(() => manager.ExportsIds())!.Code,
            Is.EqualTo(DatErrorCode.ManagerDisposed));
    }

    [Test]
    public void DisposeIsIdempotent()
    {
        var manager = DatManager.NewInstance();
        manager.Dispose();

        Assert.DoesNotThrow(() => manager.Dispose());
    }

    [Test]
    public void DisposedCertificateRejectsSigning()
    {
        var cert = Generate(1);
        cert.Dispose();

        Assert.That(Assert.Throws<DatException>(() => DatManager.Issue(cert, "plain", "secure"))!.Code,
            Is.EqualTo(DatErrorCode.ManagerDisposed));
    }

    [Test]
    public void RepeatedImportKeepsOneCertificatePerCid()
    {
        var manager = DatManager.NewInstance();
        try
        {
            using var cert = Generate(1);
            string exported = cert.Exports(false);

            for (int i = 0; i < 50; i++) manager.Imports(exported, false);

            Assert.That(manager.ExportsIds(), Has.Count.EqualTo(1));
            Assert.DoesNotThrow(() => manager.Issue("plain", "secure"));
        }
        finally { manager.Dispose(); }
    }

    [Test]
    public void ExpiredCertificateIsNotHeld()
    {
        var manager = DatManager.NewInstance();
        try
        {
            long now = Unixtime.Now();
            using var expired = DatCertificate.Generate(
                7, now - 6000, 600, 60,
                DatSignatureAlgorithm.EcdsaP256, DatCryptoAlgorithm.IvAes256Gcm);

            Assert.That(expired.Expired, Is.True);
            Assert.That(manager.Imports([expired], true), Is.EqualTo(0));
            Assert.That(manager.ExportsIds(), Is.Empty);
        }
        finally { manager.Dispose(); }
    }
}
