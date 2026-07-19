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
        Raw = dat;
        var parts = dat.Split('.');
        if (parts.Length != 5) throw new DatException("Invalid Dat Format");

        try
        {
            Expire = long.Parse(parts[0]);
            if (Expire < Unixtime.Now()) throw new DatException("Expired Dat");

            Cid = Convert.ToInt64(parts[1], 16);
            PlainBytes = DatUtils.DecodeBase64Url(parts[2]);
            SecureBytes = DatUtils.DecodeBase64Url(parts[3]);
            SignatureBytes = DatUtils.DecodeBase64Url(parts[4]);
            Body = Encoding.UTF8.GetBytes(dat, 0, dat.LastIndexOf('.'));
        }
        catch (Exception e)
        {
            if (e is DatException) throw;
            throw new DatException("Invalid Dat Format");
        }
    }

    public object Clone() => new Dat(Raw);
}
