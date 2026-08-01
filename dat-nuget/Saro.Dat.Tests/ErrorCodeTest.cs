using System.Text;

namespace Saro.Dat.Tests;

/// <summary>
/// 오류 코드 회귀 안전망 (error.pre2.md).
///
/// 단언하는 것은 "실패했다"가 아니라 <b>어느 코드로 실패했다</b> 이다 — 재매핑 사고는
/// 전자로는 절대 안 잡힌다. 이 체계를 만든 세 가지 이유를 고정한다:
///
/// <list type="number">
/// <item>만료 / 형식 오류 / 서명 위조가 갈리는가</item>
/// <item>서명 불일치 / 백엔드 실패가 갈리는가</item>
/// <item>"발급할 인증서 없음"의 다섯 가지 사유가 갈리는가</item>
/// </list>
/// </summary>
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

    /// <summary>던져진 것이 DatException 인지 확인하고 코드를 돌려준다.</summary>
    private static string CodeOf(Action code) => Assert.Throws<DatException>(code)!.Code;

    private static DatException ErrorOf(Action code) => Assert.Throws<DatException>(code)!;

    // ---- 1. 만료 / 형식 오류 / 서명 위조 ----

    [Test]
    public void ExpiredTokenIsNotMalformed()
    {
        using var manager = IssuableManager();
        string token = manager.Issue("p", "s");
        string rest = token[(token.IndexOf('.') + 1)..];

        Assert.That(CodeOf(() => manager.Parse($"{Unixtime.Now() - 1}.{rest}")),
            Is.EqualTo(DatErrorCode.TokenExpired));

        // 정각도 만료다 (interop: expire > now 여야 유효).
        Assert.That(CodeOf(() => manager.Parse($"{Unixtime.Now()}.{rest}")),
            Is.EqualTo(DatErrorCode.TokenExpired));
    }

    [Test]
    public void MalformedTokenShapes()
    {
        using var manager = IssuableManager();
        string token = manager.Issue("p", "s");
        string[] parts = token.Split('.');

        // 파트 수 부족 / 초과
        Assert.That(CodeOf(() => manager.Parse("1.2.3")), Is.EqualTo(DatErrorCode.TokenMalformed));
        Assert.That(CodeOf(() => manager.Parse(token + ".extra")), Is.EqualTo(DatErrorCode.TokenMalformed));

        // expire 가 10진수가 아님 — 만료가 아니라 형식 오류다
        Assert.That(CodeOf(() => manager.Parse("+" + token)), Is.EqualTo(DatErrorCode.TokenMalformed));

        // cid 가 16진수가 아님
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
        // 같은 cid 를 다른 키로 발급하면 서명만 안 맞는다.
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
        // 서명 검증을 건너뛰는 경로에서는 GCM 태그가 유일한 무결성 검사다.
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

    // ---- 2. 인증서 ----

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
        // 파트 수 부족
        Assert.That(CodeOf(() => DatCertificate.Parse("a.b.c")), Is.EqualTo(DatErrorCode.CertMalformed));

        // 8 파트지만 cid 가 16진수가 아님
        Assert.That(CodeOf(() => DatCertificate.Parse("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA")),
            Is.EqualTo(DatErrorCode.CertMalformed));

        // 시간 산술 오버플로
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
        // 알고리즘 이름 오류는 인증서 형식 오류로 덮이지 않는다 — 고칠 곳이 다르다.
        Assert.That(CodeOf(() => DatCertificate.Parse("ff.1.2.3.NOPE-ALG.IV-AES256-GCM.AAAA.AAAA")),
            Is.EqualTo(DatErrorCode.ConfigAlgUnsupported));
    }

    // ---- 3. "발급할 인증서 없음" 다섯 갈래 ----

    [Test]
    public void NoCertificateAtAll()
    {
        using var manager = DatManager.NewInstance();

        var e = ErrorOf(() => manager.Issue("p", "s"));
        Assert.That(e.Code, Is.EqualTo(DatErrorCode.ManagerNoCertificate));
        // CMS 접속 문제일 수 있으므로 기다려 볼 값어치가 있다.
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
        // 기다리면 풀리는 유일한 사유다.
        Assert.That(e.Retry, Is.EqualTo(DatRetry.Transient));
    }

    [Test]
    public void IssuanceWindowClosedIsPermanent()
    {
        using var manager = DatManager.NewInstance();
        // 발급창은 닫혔지만 ttl 이 남아 검증은 된다.
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
        // 배포 설정 실수다 — 기다려도 안 풀린다.
        Assert.That(DatException.CodeOf(e.InnerException), Is.EqualTo(DatErrorCode.CertVerifyOnly));
        Assert.That(e.Retry, Is.EqualTo(DatRetry.Permanent));
    }

    // ---- 키 · 알고리즘 · 인자 ----

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
        // 예전에는 ECDSA 와 HMAC 의 키 크기 오류가 완전 동일 문구였다.
        Assert.That(CodeOf(() => IDatCrypto.FromBytes(Cry, new byte[7])), Is.EqualTo(DatErrorCode.KeyInvalid));
        Assert.That(CodeOf(() => IDatSignature.FromKey(DatSignatureAlgorithm.HmacSha256Mfs, new byte[7])),
            Is.EqualTo(DatErrorCode.KeyInvalid));
        Assert.That(CodeOf(() => IDatSignature.FromKey(Sig, new byte[7])), Is.EqualTo(DatErrorCode.KeyInvalid));
    }

    [Test]
    public void HmacVerifyOnlyExportIsStructurallyUnsupported()
    {
        // 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
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
        // 빈 입력 → 빈 출력. 모든 공식 클라이언트 공통이며 어떤 코드도 내지 않는다.
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
        // 예전에는 NullReferenceException 이 그대로 새어 나갔다.
        var crypto = IDatCrypto.Generate(Cry);
        try
        {
            Assert.That(CodeOf(() => crypto.Encrypt(null!)), Is.EqualTo(DatErrorCode.ConfigArgumentInvalid));
            Assert.That(CodeOf(() => IDatSignature.FromKey(Sig, null!)), Is.EqualTo(DatErrorCode.ConfigArgumentInvalid));
            Assert.That(CodeOf(() => DatCertificate.Parse(null!)), Is.EqualTo(DatErrorCode.ConfigArgumentInvalid));
        }
        finally { (crypto as IDisposable)?.Dispose(); }
    }

    // ---- 코드 체계 자체의 불변식 ----

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
            // 메시지가 아니라 코드가 머리에 온다.
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
        // 401 에 60초마다 영원히 재시도하던 것이 이 분류의 존재 이유다.
        foreach (string code in new[] { DatErrorCode.CmsUnauthorized, DatErrorCode.CmsForbidden, DatErrorCode.CmsEndpointNotFound })
            Assert.That(new DatException(code).Retry, Is.EqualTo(DatRetry.Permanent), code);

        foreach (string code in new[] { DatErrorCode.CmsUnreachable, DatErrorCode.CmsServerError, DatErrorCode.CmsNotSynced })
            Assert.That(new DatException(code).Retry, Is.EqualTo(DatRetry.Transient), code);

        foreach (string code in new[] { DatErrorCode.CmsSyncInProgress, DatErrorCode.CmsVersionReset })
            Assert.That(new DatException(code).Retry, Is.EqualTo(DatRetry.State), code);
    }
}
