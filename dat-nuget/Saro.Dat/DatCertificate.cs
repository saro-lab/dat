namespace Saro.Dat;

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

        var p = format.Split('.');
        if (p.Length != 8)
            throw new DatException(DatErrorCode.CertMalformed, "expected exactly 8 dot-separated fields");

        IDatSignature? signatureKey = null;
        try
        {
            long cid = Field(DatErrorCode.CertMalformed, "cid field is not a plain hex integer",
                () => DatUtils.ParseCidStrict(p[0]));
            long datIssuanceStartSeconds = Field(DatErrorCode.CertMalformed, "issuance_start_seconds field is not a plain decimal integer",
                () => DatUtils.ParseSecondsStrict(p[1]));
            long datIssuanceDurationSeconds = Field(DatErrorCode.CertMalformed, "issuance_duration_seconds field is not a plain decimal integer",
                () => DatUtils.ParseSecondsStrict(p[2]));
            long datTtlSeconds = Field(DatErrorCode.CertMalformed, "dat_ttl_seconds field is not a plain decimal integer",
                () => DatUtils.ParseSecondsStrict(p[3]));

            var signatureAlgorithm = DatSignatureAlgorithmExtensions.FromText(p[4]);
            var cryptAlgorithm = DatCryptoAlgorithmExtensions.FromText(p[5]);

            byte[] signatureKeyBytes = Field(DatErrorCode.CertMalformed, "signature_key field is not base64url",
                () => DatUtils.DecodeBase64Url(p[6]));
            byte[] cryptoKeyBytes = Field(DatErrorCode.CertMalformed, "crypto_key field is not base64url",
                () => DatUtils.DecodeBase64Url(p[7]));

            signatureKey = IDatSignature.FromKey(signatureAlgorithm, signatureKeyBytes);
            var cryptoKey = IDatCrypto.FromBytes(cryptAlgorithm, cryptoKeyBytes);

            var certificate = New(cid, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds, signatureKey, cryptoKey);
            signatureKey = null;
            return certificate;
        }
        catch
        {
            (signatureKey as IDisposable)?.Dispose();
            throw;
        }
    }

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
