using System.Text;

namespace Saro.Dat.Tests;

public class ErrorCodeTest
{
    private const DatSignatureAlgorithm Sig = DatSignatureAlgorithm.EcdsaP256;
    private const DatCryptoAlgorithm Cry = DatCryptoAlgorithm.IvAes256Gcm;

    private static DatCertificate Cert(long cid, long startOffset, long duration, long ttl) =>
        DatCertificate.Generate(cid, Unixtime.Now() + startOffset, duration, ttl, Sig, Cry);

    private static DatManager IssuableManager(long cid = 1)
    {
        var manager = DatManager.NewInstance();
        using var cert = Cert(cid, -10, 200, 100);
        manager.Imports([cert], true);
        return manager;
    }

    private static string CodeOf(Action code) => Assert.Throws<DatException>(code)!.Code;

    private static DatException ErrorOf(Action code) => Assert.Throws<DatException>(code)!;

    [Test]
    public void ExpiredTokenIsNotMalformed()
    {
        using var manager = IssuableManager();
        string token = manager.Issue("p", "s");
        string rest = token[(token.IndexOf('.') + 1)..];

        Assert.That(CodeOf(() => manager.Parse($"{Unixtime.Now() - 1}.{rest}")),
            Is.EqualTo(DatErrorCode.TokenExpired));

        Assert.That(CodeOf(() => manager.Parse($"{Unixtime.Now()}.{rest}")),
            Is.EqualTo(DatErrorCode.TokenExpired));
    }

    [Test]
    public void MalformedTokenShapes()
    {
        using var manager = IssuableManager();
        string token = manager.Issue("p", "s");
        string[] parts = token.Split('.');

        Assert.That(CodeOf(() => manager.Parse("1.2.3")), Is.EqualTo(DatErrorCode.TokenMalformed));
        Assert.That(CodeOf(() => manager.Parse(token + ".extra")), Is.EqualTo(DatErrorCode.TokenMalformed));

        Assert.That(CodeOf(() => manager.Parse("+" + token)), Is.EqualTo(DatErrorCode.TokenMalformed));

        Assert.That(CodeOf(() => manager.Parse($"{parts[0]}.zz.{string.Join('.', parts[2..])}")),
            Is.EqualTo(DatErrorCode.TokenMalformed));
    }

    [Test]
    public void EmptySignatureIsSigMalformedNotMismatch()
    {
        using var manager = IssuableManager();
        string token = manager.Issue("p", "s");
        string[] parts = token.Split('.');

        Assert.That(CodeOf(() => manager.Parse(string.Join('.', parts[..4]) + ".")),
            Is.EqualTo(DatErrorCode.SigMalformed));
    }

    [Test]
    public void ForgedSignatureIsSigMismatch()
    {
        using var victim = IssuableManager(7);
        using var attacker = IssuableManager(7);
        string forged = attacker.Issue("p", "s");

        var e = ErrorOf(() => victim.Parse(forged));
        Assert.That(e.Code, Is.EqualTo(DatErrorCode.SigMismatch));
        Assert.That(e.SecurityEvent, Is.True, "위조는 보안 이벤트로 표시되어야 한다");
        Assert.That(e.Retry, Is.EqualTo(DatRetry.Permanent));
    }

    [Test]
    public void TamperedSecureIsCryptoTagMismatch()
    {
        using var manager = IssuableManager();
        string token = manager.Issue("plain", "secure-payload");
        string[] parts = token.Split('.');

        string secure = parts[3];
        char last = secure[^1];
        parts[3] = secure[..^1] + (last == 'A' ? 'B' : 'A');

        var e = ErrorOf(() => manager.ParseWithoutVerifying(string.Join('.', parts)));
        Assert.That(e.Code, Is.EqualTo(DatErrorCode.CryptoTagMismatch));
        Assert.That(e.SecurityEvent, Is.True);
    }

    [Test]
    public void UnknownCidIsCertNotFound()
    {
        using var manager = IssuableManager(1);
        using var other = IssuableManager(999);
        string token = other.Issue("p", "s");

        Assert.That(CodeOf(() => manager.Parse(token)), Is.EqualTo(DatErrorCode.CertNotFound));
    }

    [Test]
    public void DuplicateCidOnImport()
    {
        using var manager = DatManager.NewInstance();
        using var a = Cert(5, -10, 200, 100);
        using var b = Cert(5, -10, 200, 100);

        Assert.That(CodeOf(() => manager.Imports([a, b], true)), Is.EqualTo(DatErrorCode.CertDuplicateCid));
    }

    [Test]
    public void MalformedCertificateShapes()
    {
        Assert.That(CodeOf(() => DatCertificate.Parse("a.b.c")), Is.EqualTo(DatErrorCode.CertMalformed));

        Assert.That(CodeOf(() => DatCertificate.Parse("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA")),
            Is.EqualTo(DatErrorCode.CertMalformed));

        var sk = IDatSignature.Generate(Sig);
        var ck = IDatCrypto.Generate(Cry);
        try
        {
            Assert.That(CodeOf(() => DatCertificate.New(1, long.MaxValue, 1, 0, sk, ck)),
                Is.EqualTo(DatErrorCode.CertMalformed));
        }
        finally
        {
            (sk as IDisposable)?.Dispose();
            (ck as IDisposable)?.Dispose();
        }
    }

    [Test]
    public void UnknownAlgorithmInCertificateIsNotFolded()
    {
        Assert.That(CodeOf(() => DatCertificate.Parse("ff.1.2.3.NOPE-ALG.IV-AES256-GCM.AAAA.AAAA")),
            Is.EqualTo(DatErrorCode.ConfigAlgUnsupported));
    }

    [Test]
    public void NoCertificateAtAll()
    {
        using var manager = DatManager.NewInstance();

        var e = ErrorOf(() => manager.Issue("p", "s"));
        Assert.That(e.Code, Is.EqualTo(DatErrorCode.ManagerNoCertificate));
        Assert.That(e.Retry, Is.EqualTo(DatRetry.Transient));
    }

    [Test]
    public void IssuanceWindowNotYetOpenIsTransient()
    {
        using var manager = DatManager.NewInstance();
        using (var cert = Cert(1, 3600, 200, 100)) manager.Imports([cert], true);

        var e = ErrorOf(() => manager.Issue("p", "s"));
        Assert.That(e.Code, Is.EqualTo(DatErrorCode.ManagerNoIssuableCertificate));
        Assert.That(DatException.CodeOf(e.InnerException), Is.EqualTo(DatErrorCode.CertNotYetIssuable));
        Assert.That(e.Retry, Is.EqualTo(DatRetry.Transient));
    }

    [Test]
    public void IssuanceWindowClosedIsPermanent()
    {
        using var manager = DatManager.NewInstance();
        using (var cert = Cert(1, -500, 100, 3600)) manager.Imports([cert], true);

        var e = ErrorOf(() => manager.Issue("p", "s"));
        Assert.That(e.Code, Is.EqualTo(DatErrorCode.ManagerNoIssuableCertificate));
        Assert.That(DatException.CodeOf(e.InnerException), Is.EqualTo(DatErrorCode.CertIssuanceEnded));
        Assert.That(e.Retry, Is.EqualTo(DatRetry.Permanent));
    }

    [Test]
    public void VerifyOnlyCertificateCannotIssue()
    {
        using var manager = DatManager.NewInstance();
        using (var source = Cert(1, -10, 200, 100))
        using (var verifyOnly = DatCertificate.Parse(source.Exports(true)))
        {
            manager.Imports([verifyOnly], true);
        }

        var e = ErrorOf(() => manager.Issue("p", "s"));
        Assert.That(e.Code, Is.EqualTo(DatErrorCode.ManagerNoIssuableCertificate));
        Assert.That(DatException.CodeOf(e.InnerException), Is.EqualTo(DatErrorCode.CertVerifyOnly));
        Assert.That(e.Retry, Is.EqualTo(DatRetry.Permanent));
    }

    [Test]
    public void UnknownAlgorithmNames()
    {
        Assert.That(CodeOf(() => DatSignatureAlgorithmExtensions.FromText("NOPE")),
            Is.EqualTo(DatErrorCode.ConfigAlgUnsupported));
        Assert.That(CodeOf(() => DatCryptoAlgorithmExtensions.FromText("NOPE")),
            Is.EqualTo(DatErrorCode.ConfigAlgUnsupported));
    }

    [Test]
    public void WrongKeySizeIsKeyInvalid()
    {
        Assert.That(CodeOf(() => IDatCrypto.FromBytes(Cry, new byte[7])), Is.EqualTo(DatErrorCode.KeyInvalid));
        Assert.That(CodeOf(() => IDatSignature.FromKey(DatSignatureAlgorithm.HmacSha256Mfs, new byte[7])),
            Is.EqualTo(DatErrorCode.KeyInvalid));
        Assert.That(CodeOf(() => IDatSignature.FromKey(Sig, new byte[7])), Is.EqualTo(DatErrorCode.KeyInvalid));
    }

    [Test]
    public void HmacVerifyOnlyExportIsStructurallyUnsupported()
    {
        var hmac = IDatSignature.Generate(DatSignatureAlgorithm.HmacSha256Mfs);
        try
        {
            Assert.That(CodeOf(() => hmac.ExportKey(true)), Is.EqualTo(DatErrorCode.KeyVerifyOnlyUnsupported));
        }
        finally { (hmac as IDisposable)?.Dispose(); }
    }

    [Test]
    public void SigningWithVerifyOnlyKeyIsKeyMissing()
    {
        var source = IDatSignature.Generate(Sig);
        byte[] pub = source.ExportKey(true);
        var publicOnly = IDatSignature.FromKey(Sig, pub);
        try
        {
            Assert.That(CodeOf(() => publicOnly.Sign(Encoding.UTF8.GetBytes("body"))),
                Is.EqualTo(DatErrorCode.SigKeyMissing));
        }
        finally
        {
            (source as IDisposable)?.Dispose();
            (publicOnly as IDisposable)?.Dispose();
        }
    }

    [Test]
    public void CiphertextShorterThanIv()
    {
        var crypto = IDatCrypto.Generate(Cry);
        try
        {
            Assert.That(CodeOf(() => crypto.Decrypt(new byte[5])), Is.EqualTo(DatErrorCode.CryptoDataInvalid));
        }
        finally { (crypto as IDisposable)?.Dispose(); }
    }

    [Test]
    public void EmptySecurePayloadIsNotAnError()
    {
        var crypto = IDatCrypto.Generate(Cry);
        try
        {
            Assert.That(crypto.Encrypt([]), Is.Empty);
            Assert.That(crypto.Decrypt([]), Is.Empty);
        }
        finally { (crypto as IDisposable)?.Dispose(); }
    }

    [Test]
    public void NullArgumentsAreConfigErrors()
    {
        var crypto = IDatCrypto.Generate(Cry);
        try
        {
            Assert.That(CodeOf(() => crypto.Encrypt(null!)), Is.EqualTo(DatErrorCode.ConfigArgumentInvalid));
            Assert.That(CodeOf(() => IDatSignature.FromKey(Sig, null!)), Is.EqualTo(DatErrorCode.ConfigArgumentInvalid));
            Assert.That(CodeOf(() => DatCertificate.Parse(null!)), Is.EqualTo(DatErrorCode.ConfigArgumentInvalid));
        }
        finally { (crypto as IDisposable)?.Dispose(); }
    }

    [Test]
    public void CodesAreWellFormed()
    {
        string[] samples =
        [
            DatErrorCode.TokenMalformed, DatErrorCode.TokenExpired, DatErrorCode.CertExpired,
            DatErrorCode.CertNotSynced, DatErrorCode.SigMismatch, DatErrorCode.CryptoTagMismatch,
            DatErrorCode.KeyInvalid, DatErrorCode.ManagerNoCertificate, DatErrorCode.CmsUnauthorized,
            DatErrorCode.CmsSyncInProgress, DatErrorCode.ConfigAlgUnsupported, DatErrorCode.InternalUnavailable,
        ];

        foreach (string code in samples)
        {
            Assert.That(code, Does.StartWith("DAT_"));
            Assert.That(code.All(c => (c >= 'A' && c <= 'Z') || c == '_'), Is.True,
                $"{code} must be SCREAMING_SNAKE_CASE");
            Assert.That(new DatException(code).Message, Is.EqualTo(code));
            Assert.That(new DatException(code, "detail").Message, Is.EqualTo($"{code}: detail"));
        }
    }

    [Test]
    public void CauseChainIsPreserved()
    {
        var inner = new DatException(DatErrorCode.CertMalformed, "bad field");
        var outer = new DatException(DatErrorCode.CmsImportFailed, "cannot apply", inner);

        Assert.That(outer.Code, Is.EqualTo(DatErrorCode.CmsImportFailed));
        Assert.That(DatException.CodeOf(outer.InnerException), Is.EqualTo(DatErrorCode.CertMalformed));
    }

    [Test]
    public void RetryClassification()
    {
        foreach (string code in new[] { DatErrorCode.CmsUnauthorized, DatErrorCode.CmsForbidden, DatErrorCode.CmsEndpointNotFound })
            Assert.That(new DatException(code).Retry, Is.EqualTo(DatRetry.Permanent), code);

        foreach (string code in new[] { DatErrorCode.CmsUnreachable, DatErrorCode.CmsServerError, DatErrorCode.CmsNotSynced })
            Assert.That(new DatException(code).Retry, Is.EqualTo(DatRetry.Transient), code);

        foreach (string code in new[] { DatErrorCode.CmsSyncInProgress, DatErrorCode.CmsVersionReset })
            Assert.That(new DatException(code).Retry, Is.EqualTo(DatRetry.State), code);
    }
}
