using Microsoft.Extensions.Logging;
using Saro.Dat;
using Serilog;
using ILogger = Serilog.ILogger;

namespace Saro.Dat.Tests;

public class ExampleCmsManagerTest
{
    private static ILoggerFactory CreateLoggerFactory()
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
            .CreateLogger();

        return LoggerFactory.Create(builder =>
        {
            builder.AddSerilog();
        });
    }

    [Test]
    public async Task UseDatCms()
    {
        using var loggerFactory = CreateLoggerFactory();
        var logger = loggerFactory.CreateLogger<DatCmsManager>();

        DatCmsManager manager = await DatCmsManager.Builder()
            .Host("localhost")
            .Port(8088)
            .IntervalSeconds(1)
            .Token("12345678901b")
            .Logger(logger)
            .BuildAsync();

        try
        {
            string plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
            string secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

            Console.WriteLine("plain : " + plain);
            Console.WriteLine("secure : " + secure);

            string dat = manager.Issue(plain, secure);
            Console.WriteLine("dat : " + dat);

            Payload payload = manager.Parse(dat);

            string payloadPlain = payload.Plain;
            string payloadSecure = payload.Secure;

            Console.WriteLine("payload plain : " + payloadPlain);
            Console.WriteLine("payload secure : " + payloadSecure);

            Assert.That(payloadPlain, Is.EqualTo(plain));
            Assert.That(payloadSecure, Is.EqualTo(secure));
        } catch (Exception ex)
        {
            Console.WriteLine(ex);
        }

        await Task.Delay(5 * 1000);
    }
}
