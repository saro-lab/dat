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

        // 1) 먼저 구조를 확정한다. 파트가 5개가 아니면 그건 만료된 토큰이 아니라
        //    애초에 토큰이 아니다.
        var parts = dat.Split('.');
        if (parts.Length != 5)
            throw new DatException(DatErrorCode.TokenMalformed, "expected exactly 5 dot-separated fields");

        // 2) 구조가 맞은 뒤에야 값을 본다. 예전에는 여기 8가지 원인이 전부
        //    "Invalid Dat Format" 한 문자열로 뭉개졌다 — 만료·형식 오류·키 오류가
        //    같은 값이라 호출부가 대응을 고를 수 없었다.
        Expire = Field(DatErrorCode.TokenMalformed, "expire field is not a plain decimal integer",
            () => DatUtils.ParseSecondsStrict(parts[0]));

        // rust keeps a DAT only while expire > now (dat.rs), so the instant the
        // expiry second arrives the token is dead in every port.
        if (Expire <= Unixtime.Now())
            throw new DatException(DatErrorCode.TokenExpired);

        Cid = Field(DatErrorCode.TokenMalformed, "cid field is not a plain hex integer",
            () => DatUtils.ParseCidStrict(parts[1]));
        PlainBytes = Field(DatErrorCode.TokenMalformed, "plain field is not base64url",
            () => DatUtils.DecodeBase64Url(parts[2]));
        SecureBytes = Field(DatErrorCode.TokenMalformed, "secure field is not base64url",
            () => DatUtils.DecodeBase64Url(parts[3]));

        // 서명 파트의 문제는 토큰 구조가 아니라 서명 자체의 형식 오류다.
        if (parts[4].Length == 0)
            throw new DatException(DatErrorCode.SigMalformed, "signature field is empty");
        SignatureBytes = Field(DatErrorCode.SigMalformed, "signature field is not base64url",
            () => DatUtils.DecodeBase64Url(parts[4]));
        if (SignatureBytes.Length == 0)
            throw new DatException(DatErrorCode.SigMalformed, "signature field is empty");

        Body = Encoding.UTF8.GetBytes(dat, 0, dat.LastIndexOf('.'));
    }

    /// <summary>
    /// 필드 하나를 읽되, 실패하면 어느 필드가 왜 틀렸는지를 코드와 함께 남긴다.
    /// 하위 예외(FormatException 등)는 InnerException 으로 보존한다.
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

    public object Clone() => new Dat(Raw);
}
