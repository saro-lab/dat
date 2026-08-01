namespace Saro.Dat.Tests;

/// <summary>
/// The manager holds native ECDSA handles through its certificates. Importing on
/// a CMS refresh loop used to clone every held certificate and never release the
/// previous ones, so the handles accumulated for as long as the process ran.
/// </summary>
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

        // The manager disposed its own copy; the caller's instance is untouched.
        Assert.DoesNotThrow(() => DatManager.Issue(cert, "plain", "secure"));
    }

    [Test]
    public void DisposedManagerRejectsUse()
    {
        using var cert = Generate(1);
        var manager = DatManager.NewInstance();
        manager.Imports([cert], true);
        manager.Dispose();

        // 해제된 매니저는 락의 ObjectDisposedException 이 아니라 이 체계의 코드로 거부한다.
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

        // 예전에는 crypto 쪽이 해제를 보지 않아 "서명은 죽고 복호화는 살아있는" 상태였다.
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

            // What a CMS sync loop does: the same bundle over and over.
            for (int i = 0; i < 50; i++) manager.Imports(exported, false);

            Assert.That(manager.ExportsIds(), Has.Count.EqualTo(1));
            // Still usable after all those imports, i.e. the surviving certificate
            // was never the one disposed.
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
