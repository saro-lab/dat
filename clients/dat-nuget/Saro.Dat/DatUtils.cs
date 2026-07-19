using System.Buffers.Text;
using System.Security.Cryptography;

namespace Saro.Dat;

public static class DatUtils
{
    private static readonly char[] MoldBase62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".ToCharArray();

    public static string EncodeBase64Url(byte[] bytes) => Base64Url.EncodeToString(bytes);

    public static byte[] DecodeBase64Url(string str)
    {
        if (string.IsNullOrEmpty(str)) return Array.Empty<byte>();
        return Base64Url.DecodeFromChars(str);
    }

    public static string GenerateRandomBase62(int size)
    {
        var rv = new char[size];
        for (int i = 0; i < size; i++)
        {
            rv[i] = MoldBase62[RandomNumberGenerator.GetInt32(MoldBase62.Length)];
        }
        return new string(rv);
    }
}
