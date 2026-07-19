namespace Saro.Dat;

public static class Unixtime
{
    public static long Now() => DateTimeOffset.UtcNow.ToUnixTimeSeconds();
}
