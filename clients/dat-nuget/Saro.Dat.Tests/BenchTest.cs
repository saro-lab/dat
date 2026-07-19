using System.Diagnostics;
using System.Text;

namespace Saro.Dat.Tests;

public class BenchTest
{
    public void RunLoop(bool multiThread, int loop, List<DatCertificate> certificates, string plain, string secure)
    {
        TestContext.Progress.WriteLine($"\n{(multiThread ? "Multi-Thread " : "Single-Thread ")}");

        byte[] plainBytes = Encoding.UTF8.GetBytes(plain);
        byte[] secureBytes = Encoding.UTF8.GetBytes(secure);

        foreach (var cert in certificates)
        {
            string pre = $"{cert.Signature.Algorithm()} {cert.Crypto.Algorithm()} ";

            var sw = Stopwatch.StartNew();
            string[] dats = new string[loop];

            if (multiThread)
            {
                Parallel.For(0, loop, i => {
                    dats[i] = DatManager.Issue(cert, plainBytes, secureBytes);
                });
            }
            else
            {
                for (int i = 0; i < loop; i++)
                {
                    dats[i] = DatManager.Issue(cert, plainBytes, secureBytes);
                }
            }
            TestContext.Progress.WriteLine($"{pre}Issue * {dats.Length} : {sw.ElapsedMilliseconds}ms");

            sw.Restart();
            Payload[] payloads = new Payload[loop];
            string targetDat = dats[0];

            if (multiThread)
            {
                Parallel.For(0, loop, i => {
                    payloads[i] = DatManager.Parse(cert, targetDat);
                });
            }
            else
            {
                for (int i = 0; i < loop; i++)
                {
                    payloads[i] = DatManager.Parse(cert, targetDat);
                }
            }
            TestContext.Progress.WriteLine($"{pre}Parse * {payloads.Length} : {sw.ElapsedMilliseconds}ms");

            Assert.That(payloads[0].Plain, Is.EqualTo(plain));
            Assert.That(payloads[0].Secure, Is.EqualTo(secure));
        }
    }

    [Test]
    [Explicit]
    public void Test()
    {
        int loopCount = 10000;
        long now = Unixtime.Now();
        string plain = DatUtils.GenerateRandomBase62(100);
        string secure = DatUtils.GenerateRandomBase62(100);

        TestContext.Progress.WriteLine($"Plain : {plain}");
        TestContext.Progress.WriteLine($"Secure : {secure}");

        var certificates = Enum.GetValues<DatSignatureAlgorithm>()
            .SelectMany(sa => Enum.GetValues<DatCryptoAlgorithm>()
                .Select(ca => DatCertificate.Generate(
                    0,
                    now - 10,
                    600,
                    60,
                    sa,
                    ca
                ))
            ).ToList();

        RunLoop(true, loopCount, certificates, plain, secure);

        RunLoop(false, loopCount, certificates, plain, secure);
    }
}
