namespace Saro.Dat;

public class DatCertificate : ICloneable
{
    public long Cid { get; }
    internal IDatSignature Signature { get; }
    internal IDatCrypto Crypto { get; }
    public long DatIssuanceStartSeconds { get; }
    public long DatIssuanceEndSeconds { get; }
    public long DatTtlSeconds { get; }

    private DatCertificate(long cid, IDatSignature signature, IDatCrypto crypt, long ib, long ie, long datTtlSeconds)
    {
        Cid = cid;
        Signature = signature;
        Crypto = crypt;
        DatIssuanceStartSeconds = ib;
        DatIssuanceEndSeconds = ie;
        DatTtlSeconds = datTtlSeconds;
    }

    public bool Expired => DatIssuanceEndSeconds + DatTtlSeconds < Unixtime.Now();
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

    public object Clone() => new DatCertificate(Cid, Signature.Clone(), Crypto.Clone(), DatIssuanceStartSeconds, DatIssuanceEndSeconds, DatTtlSeconds);

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
        if (datIssuanceStartSeconds < 0) throw new DatException("datIssuanceStartSeconds must >= 0");
        if (datTtlSeconds < 1) throw new DatException("datTtlSeconds must > 0");
        if (datIssuanceDurationSeconds < 1) throw new DatException("datIssuanceDurationSeconds must > 0");
        return new DatCertificate(cid, sk, ck, datIssuanceStartSeconds, datIssuanceStartSeconds + datIssuanceDurationSeconds, datTtlSeconds);
    }

    public static DatCertificate Parse(string format)
    {
        try
        {
            var p = format.Split('.');
            if (p.Length == 8)
            {
                long cid = Convert.ToInt64(p[0], 16);
                long datIssuanceStartSeconds = long.Parse(p[1]);
                long datIssuanceDurationSeconds = long.Parse(p[2]);
                long datTtlSeconds = long.Parse(p[3]);
                var signatureAlgorithm = DatSignatureAlgorithmExtensions.FromText(p[4]);
                var cryptAlgorithm = DatCryptoAlgorithmExtensions.FromText(p[5]);
                var signatureKey = IDatSignature.FromKey(signatureAlgorithm, DatUtils.DecodeBase64Url(p[6]));
                var cryptoKey = IDatCrypto.FromBytes(cryptAlgorithm, DatUtils.DecodeBase64Url(p[7]));

                return New(cid, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds, signatureKey, cryptoKey);
            }
        }
        catch (Exception e)
        {
            if (e is DatException) throw;
        }
        throw new DatException("Invalid Dat Certificate Format");
    }
}
