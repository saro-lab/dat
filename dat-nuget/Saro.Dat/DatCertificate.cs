namespace Saro.Dat;

/// <summary>
/// Owns its signature and crypto keys. Dispose releases the native key handles
/// behind them (ECDSA in particular); a certificate handed to
/// <see cref="DatManager.Imports(List{DatCertificate}, bool)"/> is copied, so
/// the caller keeps ownership of what it passed in.
/// </summary>
public class DatCertificate : ICloneable, IDisposable
{
    public long Cid { get; }
    internal IDatSignature Signature { get; }
    internal IDatCrypto Crypto { get; }
    public long DatIssuanceStartSeconds { get; }
    public long DatIssuanceEndSeconds { get; }
    public long DatTtlSeconds { get; }
    public long ExpireSeconds { get; }

    private bool _disposed;

    private DatCertificate(long cid, IDatSignature signature, IDatCrypto crypt, long ib, long ie, long datTtlSeconds, long expireSeconds)
    {
        Cid = cid;
        Signature = signature;
        Crypto = crypt;
        DatIssuanceStartSeconds = ib;
        DatIssuanceEndSeconds = ie;
        DatTtlSeconds = datTtlSeconds;
        ExpireSeconds = expireSeconds;
    }

    public bool Expired => ExpireSeconds < Unixtime.Now();
    public bool Issuable
    {
        get
        {
            long now = Unixtime.Now();
            return Signature.Signable() && now >= DatIssuanceStartSeconds && now <= DatIssuanceEndSeconds;
        }
    }

    public string Exports(bool verifyOnly = false)
    {
        return $"{Cid:x}.{DatIssuanceStartSeconds}.{DatIssuanceEndSeconds - DatIssuanceStartSeconds}.{DatTtlSeconds}.{Signature.Algorithm().ToText()}.{Crypto.Algorithm().ToText()}.{DatUtils.EncodeBase64Url(Signature.ExportKey(verifyOnly))}.{DatUtils.EncodeBase64Url(Crypto.ToBytes())}";
    }

    public override string ToString() => Exports(false);

    /// <summary>
    /// Returns an independent copy holding its own key handles. The caller owns
    /// the copy and is responsible for disposing it.
    /// </summary>
    public object Clone() => new DatCertificate(Cid, Signature.Clone(), Crypto.Clone(), DatIssuanceStartSeconds, DatIssuanceEndSeconds, DatTtlSeconds, ExpireSeconds);

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        (Signature as IDisposable)?.Dispose();
        (Crypto as IDisposable)?.Dispose();
    }

    public override bool Equals(object? obj)
    {
        if (obj is DatCertificate other) return this.Cid == other.Cid;
        return false;
    }

    public override int GetHashCode() => Cid.GetHashCode();

    public static DatCertificate Generate(long cid, long datIssuanceStartSeconds, long datIssuanceDurationSeconds, long datTtlSeconds, DatSignatureAlgorithm sa, DatCryptoAlgorithm ca)
    {
        return New(
            cid,
            datIssuanceStartSeconds,
            datIssuanceDurationSeconds,
            datTtlSeconds,
            IDatSignature.Generate(sa),
            IDatCrypto.Generate(ca)
        );
    }

    public static DatCertificate New(long cid, long datIssuanceStartSeconds, long datIssuanceDurationSeconds, long datTtlSeconds, IDatSignature sk, IDatCrypto ck)
    {
        // Bounds match dat-rust's DatCertificate::from, which takes u64s and only
        // rejects the two additions overflowing. Zero duration / zero ttl are
        // therefore legal here too; only negatives (unrepresentable as u64) and
        // overflow are refused.
        if (sk is null) throw new DatException(DatErrorCode.ConfigArgumentInvalid, "signature key is null");
        if (ck is null) throw new DatException(DatErrorCode.ConfigArgumentInvalid, "crypto key is null");
        if (datIssuanceStartSeconds < 0) throw new DatException(DatErrorCode.CertMalformed, "datIssuanceStartSeconds must be >= 0");
        if (datIssuanceDurationSeconds < 0) throw new DatException(DatErrorCode.CertMalformed, "datIssuanceDurationSeconds must be >= 0");
        if (datTtlSeconds < 0) throw new DatException(DatErrorCode.CertMalformed, "datTtlSeconds must be >= 0");

        long datIssuanceEndSeconds;
        long expireSeconds;
        try
        {
            checked
            {
                datIssuanceEndSeconds = datIssuanceStartSeconds + datIssuanceDurationSeconds;
                expireSeconds = datIssuanceEndSeconds + datTtlSeconds;
            }
        }
        catch (OverflowException e)
        {
            throw new DatException(DatErrorCode.CertMalformed,
                "datIssuanceStartSeconds + datIssuanceDurationSeconds + datTtlSeconds overflowed", e);
        }

        return new DatCertificate(cid, sk, ck, datIssuanceStartSeconds, datIssuanceEndSeconds, datTtlSeconds, expireSeconds);
    }

    public static DatCertificate Parse(string format)
    {
        if (format is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "certificate string is null");

        // 먼저 구조를 확정한다. 파트가 8개가 아니면 필드 값을 볼 것도 없다.
        var p = format.Split('.');
        if (p.Length != 8)
            throw new DatException(DatErrorCode.CertMalformed, "expected exactly 8 dot-separated fields");

        IDatSignature? signatureKey = null;
        try
        {
            // 예전에는 여기 8가지 원인이 전부 "Invalid Dat Certificate Format" 한
            // 문자열이었다. 필드 파싱·알고리즘 이름·키 재료는 대응이 전부 다르다.
            long cid = Field(DatErrorCode.CertMalformed, "cid field is not a plain hex integer",
                () => DatUtils.ParseCidStrict(p[0]));
            long datIssuanceStartSeconds = Field(DatErrorCode.CertMalformed, "issuance_start_seconds field is not a plain decimal integer",
                () => DatUtils.ParseSecondsStrict(p[1]));
            long datIssuanceDurationSeconds = Field(DatErrorCode.CertMalformed, "issuance_duration_seconds field is not a plain decimal integer",
                () => DatUtils.ParseSecondsStrict(p[2]));
            long datTtlSeconds = Field(DatErrorCode.CertMalformed, "dat_ttl_seconds field is not a plain decimal integer",
                () => DatUtils.ParseSecondsStrict(p[3]));

            // 알고리즘 이름과 키 재료는 그 자체 코드(CONFIG_ALG_UNSUPPORTED / KEY_INVALID)를
            // 그대로 올린다. 인증서 형식 오류로 덮어쓰지 않는다.
            var signatureAlgorithm = DatSignatureAlgorithmExtensions.FromText(p[4]);
            var cryptAlgorithm = DatCryptoAlgorithmExtensions.FromText(p[5]);

            byte[] signatureKeyBytes = Field(DatErrorCode.CertMalformed, "signature_key field is not base64url",
                () => DatUtils.DecodeBase64Url(p[6]));
            byte[] cryptoKeyBytes = Field(DatErrorCode.CertMalformed, "crypto_key field is not base64url",
                () => DatUtils.DecodeBase64Url(p[7]));

            signatureKey = IDatSignature.FromKey(signatureAlgorithm, signatureKeyBytes);
            var cryptoKey = IDatCrypto.FromBytes(cryptAlgorithm, cryptoKeyBytes);

            var certificate = New(cid, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds, signatureKey, cryptoKey);
            signatureKey = null; // ownership handed to the certificate
            return certificate;
        }
        catch
        {
            // The signature key may already hold a native ECDSA handle when a later
            // field fails to parse; nothing else can reach it, so release it here.
            (signatureKey as IDisposable)?.Dispose();
            throw;
        }
    }

    /// <summary>
    /// 필드 하나를 읽되, 실패하면 어느 필드가 왜 틀렸는지를 코드와 함께 남긴다.
    /// </summary>
    private static T Field<T>(string code, string detail, Func<T> read)
    {
        try
        {
            return read();
        }
        catch (DatException)
        {
            throw;
        }
        catch (Exception e)
        {
            throw new DatException(code, detail, e);
        }
    }
}
