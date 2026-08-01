namespace Saro.Dat.Tests;

/// <summary>
/// Pins the base64url behaviour that DatUtils has to provide identically on both
/// target frameworks: net10.0 forwards to System.Buffers.Text.Base64Url, net8.0
/// runs the shim in DatUtils. Certificates and DATs cross ports as base64url, so
/// a divergence here is a divergence in the wire format.
/// </summary>
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
        // Chosen so the standard alphabet would need both '+' and '/': "+/8=".
        byte[] bytes = [0xFB, 0xFF];

        string encoded = DatUtils.EncodeBase64Url(bytes);

        Assert.That(encoded, Is.EqualTo("-_8"));
        Assert.That(DatUtils.DecodeBase64Url(encoded), Is.EqualTo(bytes));
    }

    [Test]
    public void RejectsStandardAlphabet()
    {
        // The standard-alphabet spelling of the same bytes must not decode, or a
        // base64 (non-url) producer would silently interoperate.
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
        // A trailing group of one character carries no whole byte.
        Assert.Throws<FormatException>(() => DatUtils.DecodeBase64Url("A"));
        Assert.Throws<FormatException>(() => DatUtils.DecodeBase64Url("AAAAA"));
    }
}
