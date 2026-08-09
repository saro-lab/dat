namespace Saro.Dat.Tests;

public class Base64UrlTest
{
    [Test]
    public void RoundTripsEveryLength()
    {
        for (int len = 0; len <= 64; len++)
        {
            byte[] bytes = new byte[len];
            Random.Shared.NextBytes(bytes);

            string encoded = DatUtils.EncodeBase64Url(bytes);
            Assert.That(DatUtils.DecodeBase64Url(encoded), Is.EqualTo(bytes), $"round trip failed at length {len}");
        }
    }

    [Test]
    public void EmptyMapsToEmpty()
    {
        Assert.That(DatUtils.EncodeBase64Url([]), Is.EqualTo(string.Empty));
        Assert.That(DatUtils.DecodeBase64Url(string.Empty), Is.Empty);
    }

    [Test]
    public void UsesUrlAlphabetAndNoPadding()
    {
        byte[] bytes = [0xFB, 0xFF];

        string encoded = DatUtils.EncodeBase64Url(bytes);

        Assert.That(encoded, Is.EqualTo("-_8"));
        Assert.That(DatUtils.DecodeBase64Url(encoded), Is.EqualTo(bytes));
    }

    [Test]
    public void RejectsStandardAlphabet()
    {
        Assert.Throws<FormatException>(() => DatUtils.DecodeBase64Url("+/8"));
    }

    [Test]
    public void RejectsNonAlphabetCharacters()
    {
        Assert.Throws<FormatException>(() => DatUtils.DecodeBase64Url("!!!!"));
        Assert.Throws<FormatException>(() => DatUtils.DecodeBase64Url("ab*d"));
    }

    [Test]
    public void RejectsDanglingCharacter()
    {
        Assert.Throws<FormatException>(() => DatUtils.DecodeBase64Url("A"));
        Assert.Throws<FormatException>(() => DatUtils.DecodeBase64Url("AAAAA"));
    }
}
