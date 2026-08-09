using System.Text;

namespace Saro.Dat;

public class Dat : ICloneable
{
    public string Raw { get; }
    public long Expire { get; }
    public long Cid { get; }
    internal byte[] PlainBytes { get; }
    internal byte[] SecureBytes { get; }
    internal byte[] SignatureBytes { get; }
    internal byte[] Body { get; }

    public Dat(string dat)
    {
        if (dat is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "dat string is null");

        Raw = dat;

        var parts = dat.Split('.');
        if (parts.Length != 5)
            throw new DatException(DatErrorCode.TokenMalformed, "expected exactly 5 dot-separated fields");

        Expire = Field(DatErrorCode.TokenMalformed, "expire field is not a plain decimal integer",
            () => DatUtils.ParseSecondsStrict(parts[0]));

        if (Expire <= Unixtime.Now())
            throw new DatException(DatErrorCode.TokenExpired);

        Cid = Field(DatErrorCode.TokenMalformed, "cid field is not a plain hex integer",
            () => DatUtils.ParseCidStrict(parts[1]));
        PlainBytes = Field(DatErrorCode.TokenMalformed, "plain field is not base64url",
            () => DatUtils.DecodeBase64Url(parts[2]));
        SecureBytes = Field(DatErrorCode.TokenMalformed, "secure field is not base64url",
            () => DatUtils.DecodeBase64Url(parts[3]));

        if (parts[4].Length == 0)
            throw new DatException(DatErrorCode.SigMalformed, "signature field is empty");
        SignatureBytes = Field(DatErrorCode.SigMalformed, "signature field is not base64url",
            () => DatUtils.DecodeBase64Url(parts[4]));
        if (SignatureBytes.Length == 0)
            throw new DatException(DatErrorCode.SigMalformed, "signature field is empty");

        Body = Encoding.UTF8.GetBytes(dat, 0, dat.LastIndexOf('.'));
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

    public object Clone() => new Dat(Raw);
}
