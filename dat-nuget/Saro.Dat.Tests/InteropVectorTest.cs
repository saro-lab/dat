using Saro.Dat;

namespace Saro.Dat.Tests;

public class InteropVectorTest
{
    [Test]
    public void ParseRustVectors()
    {
        var path = Environment.GetEnvironmentVariable("DAT_INTEROP_VECTORS");
        if (string.IsNullOrEmpty(path) || !File.Exists(path))
        {
            Assert.Ignore("DAT_INTEROP_VECTORS not set");
            return;
        }

        DatManager manager = DatManager.NewInstance();
        var checkedCount = 0;

        foreach (var line in File.ReadAllLines(path).Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            var parts = line.Split('\t', 2);
            var tag = parts[0];
            var value = parts[1];

            if (tag == "CERT")
            {
                manager = DatManager.NewInstance();
                manager.Imports(value, true);
                continue;
            }

            var payload = manager.Parse(value);
            switch (tag)
            {
                case "DAT_EMPTY_SECURE":
                    Assert.That(payload.Plain, Is.EqualTo("hello"));
                    Assert.That(payload.Secure, Is.EqualTo(""));
                    break;
                case "DAT_EMPTY_BOTH":
                    Assert.That(payload.Plain, Is.EqualTo(""));
                    Assert.That(payload.Secure, Is.EqualTo(""));
                    break;
                case "DAT_NORMAL":
                    Assert.That(payload.Plain, Is.EqualTo("hello"));
                    Assert.That(payload.Secure, Is.EqualTo("world"));
                    break;
            }
            checkedCount++;
        }

        Assert.That(checkedCount, Is.GreaterThan(0));
        Console.WriteLine($"interop: parsed {checkedCount} rust-issued DATs");
    }
}
