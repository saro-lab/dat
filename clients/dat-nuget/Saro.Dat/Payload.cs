using System.Text;

namespace Saro.Dat;

public class Payload
{
    public byte[] PlainBytes { get; }
    public byte[] SecureBytes { get; }
    public string Plain => Encoding.UTF8.GetString(PlainBytes);
    public string Secure => Encoding.UTF8.GetString(SecureBytes);

    public override string ToString() => $"{DatUtils.EncodeBase64Url(PlainBytes)} {DatUtils.EncodeBase64Url(SecureBytes)}";

    public string ToUnsafeString() => $"{Plain} {Secure}";

    public Payload(byte[] p, byte[] s)
    {
        PlainBytes = p;
        SecureBytes = s;
    }
}
