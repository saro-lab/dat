#if NET9_0_OR_GREATER
using System.Buffers.Text;
#endif
using System.Security.Cryptography;

namespace Saro.Dat;

public static class DatUtils
{
    private static readonly char[] MoldBase62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".ToCharArray();

#if NET9_0_OR_GREATER
    public static string EncodeBase64Url(byte[] bytes) => Base64Url.EncodeToString(bytes);

    public static byte[] DecodeBase64Url(string str)
    {
        if (string.IsNullOrEmpty(str)) return Array.Empty<byte>();
        return Base64Url.DecodeFromChars(str);
    }
#else

    public static string EncodeBase64Url(byte[] bytes)
    {
        if (bytes.Length == 0) return string.Empty;

        char[] chars = new char[(bytes.Length + 2) / 3 * 4];
        int len = Convert.ToBase64CharArray(bytes, 0, bytes.Length, chars, 0);

        int end = len;
        while (end > 0 && chars[end - 1] == '=') end--;
        for (int i = 0; i < end; i++)
        {
            if (chars[i] == '+') chars[i] = '-';
            else if (chars[i] == '/') chars[i] = '_';
        }
        return new string(chars, 0, end);
    }

    public static byte[] DecodeBase64Url(string str)
    {
        if (string.IsNullOrEmpty(str)) return Array.Empty<byte>();

        char[] buf = new char[str.Length + 3];
        int n = 0;
        bool padded = false;

        foreach (char c in str)
        {
            if (c is ' ' or '\t' or '\n' or '\r') continue;
            if (c == '=')
            {
                padded = true;
                continue;
            }
            if (padded) throw new FormatException("Invalid base64url: data after padding");

            buf[n++] = c switch
            {
                '-' => '+',
                '_' => '/',
                >= 'A' and <= 'Z' => c,
                >= 'a' and <= 'z' => c,
                >= '0' and <= '9' => c,
                _ => throw new FormatException($"Invalid base64url character: '{c}'")
            };
        }

        int rem = n & 3;
        if (rem == 1) throw new FormatException("Invalid base64url length");
        if (padded && rem == 0) throw new FormatException("Invalid base64url padding");

        int total = n;
        if (rem != 0)
        {
            int pad = 4 - rem;
            for (int i = 0; i < pad; i++) buf[total++] = '=';
        }
        return Convert.FromBase64CharArray(buf, 0, total);
    }
#endif

    internal static ulong ParseDecimalStrict(string s)
    {
        if (string.IsNullOrEmpty(s)) throw new FormatException("expected decimal digits");

        ulong value = 0;
        foreach (char c in s)
        {
            if (c < '0' || c > '9') throw new FormatException($"not a decimal digit: '{c}'");
            uint digit = (uint)(c - '0');
            if (value > (ulong.MaxValue - digit) / 10) throw new FormatException("decimal value out of u64 range");
            value = value * 10 + digit;
        }
        return value;
    }

    internal static ulong ParseHexStrict(string s)
    {
        if (string.IsNullOrEmpty(s)) throw new FormatException("expected hex digits");

        ulong value = 0;
        foreach (char c in s)
        {
            uint digit = c switch
            {
                >= '0' and <= '9' => (uint)(c - '0'),
                >= 'a' and <= 'f' => (uint)(c - 'a' + 10),
                >= 'A' and <= 'F' => (uint)(c - 'A' + 10),
                _ => throw new FormatException($"not a hex digit: '{c}'")
            };
            if (value > (ulong.MaxValue - digit) / 16) throw new FormatException("hex value out of u64 range");
            value = value * 16 + digit;
        }
        return value;
    }

    internal static long ParseSecondsStrict(string s)
    {
        ulong value = ParseDecimalStrict(s);
        if (value > long.MaxValue) throw new FormatException("seconds value exceeds Int64 range");
        return (long)value;
    }

    internal static long ParseCidStrict(string s) => unchecked((long)ParseHexStrict(s));

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
