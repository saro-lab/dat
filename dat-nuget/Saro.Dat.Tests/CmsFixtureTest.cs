using System.Net;
using System.Text;
using System.Text.Json;
using Saro.Dat;

namespace Saro.Dat.Tests;

public class CmsFixtureTest
{
    [Test]
    public async Task OwnedClientDoesNotFollowRedirects()
    {
        using var probe = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
        probe.Start();
        int port = ((IPEndPoint)probe.LocalEndpoint).Port;
        probe.Stop();
        using var listener = new HttpListener();
        listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        listener.Start();
        var served = Task.Run(async () => {
            HttpListenerContext context = await listener.GetContextAsync();
            context.Response.StatusCode = 302;
            context.Response.RedirectLocation = $"http://127.0.0.1:{port}/other";
            context.Response.Close();
        });
        await using var cms = await DatCmsManager.Builder().Uri($"http://127.0.0.1:{port}").Token("fixture").IntervalOff().BuildAsync();
        await served;
        Assert.That(cms.LastError!.Code, Is.EqualTo(DatErrorCode.CmsHttpStatus));
    }

    private sealed class FixtureHandler : HttpMessageHandler
    {
        public int Status = 200;
        public byte[] Body = Encoding.ASCII.GetBytes("0");
        public bool Unreachable;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (Unreachable) throw new HttpRequestException("fixture transport failure");
            return Task.FromResult(new HttpResponseMessage((HttpStatusCode)Status) {
                Content = new ByteArrayContent(Body),
                RequestMessage = request
            });
        }
    }

    private sealed class BlockingHandler : HttpMessageHandler
    {
        public bool Block;
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (Block)
            {
                Started.TrySetResult();
                await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            }
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("0") };
        }
    }

    [Test]
    public async Task DisposeAsyncCancelsAnInFlightSync()
    {
        var handler = new BlockingHandler();
        using var client = new HttpClient(handler);
        var cms = await DatCmsManager.Builder().Client(client).Token("fixture").IntervalOff().BuildAsync();
        handler.Block = true;
        Task sync = cms.SyncOrThrow();
        await handler.Started.Task.WaitAsync(TimeSpan.FromSeconds(1));
        await cms.DisposeAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(1));
        Assert.That(sync.IsCompleted, Is.True);
    }

    [Test]
    public async Task StateTransitionsFollowSignedI64Fixture()
    {
        using JsonDocument doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "cms_v1_state_transitions.json")));
        JsonElement root = doc.RootElement;
        var certificates = root.GetProperty("certificates").EnumerateObject()
            .ToDictionary(p => p.Name, p => p.Value.GetProperty("wire_ascii").GetString()!);
        var states = root.GetProperty("states").EnumerateObject().ToDictionary(p => p.Name, p => p.Value);

        foreach (JsonElement testCase in root.GetProperty("cases").EnumerateArray())
        {
            string id = testCase.GetProperty("id").GetString()!;
            string initial = testCase.GetProperty("initial").GetString()!;
            var handler = new FixtureHandler { Body = StateBody(states[initial], certificates) };
            using var client = new HttpClient(handler);
            await using var cms = await DatCmsManager.Builder().Client(client).Token("fixture").IntervalOff().BuildAsync();

            JsonElement input = testCase.GetProperty("input");
            handler.Unreachable = input.GetProperty("kind").GetString() == "transport";
            if (!handler.Unreachable)
            {
                handler.Status = input.GetProperty("status").GetInt32();
                handler.Body = Assemble(input.GetProperty("body"), certificates);
            }

            JsonElement expected = testCase.TryGetProperty("expect", out var direct)
                ? direct
                : testCase.GetProperty("expect_by_profile").GetProperty("signed_i64");
            DatException? failure = null;
            try { await cms.SyncOrThrow(); } catch (DatException e) { failure = e; }

            JsonElement expectedError = expected.GetProperty("error");
            if (expectedError.ValueKind == JsonValueKind.Null)
                Assert.That(failure, Is.Null, id);
            else
            {
                Assert.That(failure, Is.Not.Null, id);
                string code = expectedError.GetString()!.Split('(')[0];
                Assert.That(failure!.Code, Is.EqualTo(code), id);
                Assert.That(failure.Retry.ToString().ToLowerInvariant(), Is.EqualTo(expected.GetProperty("retry").GetString()), id);
            }

            JsonElement state = states[expected.GetProperty("state").GetString()!];
            Assert.That(cms.GetVersion(), Is.EqualTo(long.Parse(state.GetProperty("version").GetString()!)), id);
            Assert.That(cms.GetManager().ExportsIds(), Is.EqualTo(state.GetProperty("certificates").EnumerateArray()
                .Select(v => Convert.ToInt64(certificates[v.GetString()!].Split('.')[0], 16)).OrderBy(v => v)), id);
            if (state.GetProperty("issuer").ValueKind == JsonValueKind.Null)
                Assert.Throws<DatException>(() => cms.Issue("fixture", "fixture"), id);
            else
                Assert.DoesNotThrow(() => cms.Issue("fixture", "fixture"), id);
        }
    }

    private static byte[] StateBody(JsonElement state, Dictionary<string, string> certificates)
    {
        string version = state.GetProperty("version").GetString()!;
        string certs = string.Join("\n", state.GetProperty("certificates").EnumerateArray()
            .Select(v => certificates[v.GetString()!]));
        return Encoding.ASCII.GetBytes(certs.Length == 0 ? version : $"{version}\n{certs}");
    }

    private static byte[] Assemble(JsonElement segments, Dictionary<string, string> certificates)
    {
        using var stream = new MemoryStream();
        foreach (JsonElement segment in segments.EnumerateArray())
        {
            string kind = segment[0].GetString()!;
            string value = segment[1].GetString()!;
            byte[] bytes = kind switch {
                "ascii" => Encoding.ASCII.GetBytes(value),
                "certificate" => Encoding.ASCII.GetBytes(certificates[value]),
                "hex" => Convert.FromHexString(value),
                _ => throw new InvalidOperationException(kind)
            };
            stream.Write(bytes);
        }
        return stream.ToArray();
    }
}
