using Microsoft.Extensions.Logging;
namespace Saro.Dat;

public class DatCmsManager : IDisposable
{
    private readonly string _uri;
    private string _token;
    private long _version;
    private readonly DatManager _manager;
    private readonly HttpClient _client;
    private readonly PeriodicTimer? _timer;
    private readonly CancellationTokenSource _cts = new();
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger? _logger;

    private const string DatCmsApiVersion = "v1";

    private DatCmsManager(
        string uri,
        string token,
        long version,
        DatManager manager,
        HttpClient client,
        long intervalSeconds,
        ILogger? logger)
    {
        _uri = uri;
        _token = token;
        _version = version;
        _manager = manager;
        _client = client;
        _logger = logger;

        if (intervalSeconds > 0)
        {
            _timer = new PeriodicTimer(TimeSpan.FromSeconds(intervalSeconds));
            _ = RunSyncLoop();
        }
    }

    public DatManager GetManager() => _manager;

    public string Issue(byte[] plain, byte[] secure) => _manager.Issue(plain, secure);
    public string Issue(string plain, string secure) => _manager.Issue(plain, secure);
    public Payload Parse(Dat dat) => _manager.Parse(dat);
    public Payload Parse(string dat) => _manager.Parse(dat);
    public Payload ParseWithoutVerifying(Dat dat) => _manager.ParseWithoutVerifying(dat);
    public Payload ParseWithoutVerifying(string dat) => _manager.ParseWithoutVerifying(dat);

    private async Task RunSyncLoop()
    {
        if (_timer == null) return;
        try
        {
            while (await _timer.WaitForNextTickAsync(_cts.Token))
            {
                await Sync();
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown
        }
        catch (Exception e)
        {
            string msg = e.Message;
            _logger?.LogError("DAT CMS Sync Loop Exception {msg}", msg);
        }
    }

    public async Task Sync()
    {
        if (!await _lock.WaitAsync(0))
        {
            _logger?.LogWarning("Last request ignored (Duplicate request)");
            return;
        }

        string newUrl = $"{_uri}?version={_version}";
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, newUrl);
            request.Headers.Add("Authorization", _token);

            var response = await _client.SendAsync(request, _cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                throw new DatException($"response status error, status:{(int)response.StatusCode} in {newUrl}");
            }

            string body = await response.Content.ReadAsStringAsync(_cts.Token);
            int iof = body.IndexOf('\n');

            if (iof == 0)
            {
                throw new DatException($"invalid response: {newUrl}");
            }
            else if (iof > 0)
            {
                long newVersion = long.Parse(body[..iof].Trim());
                string newCertificates = body[(iof + 1)..].Trim();
                int renewCount = _manager.Imports(newCertificates, false);
                _version = newVersion;
                _logger?.LogInformation("renew {renewCount} certificates: {Url}", renewCount, newUrl);
            }
            else
            {
                _logger?.LogDebug("no new certificate: {Url}", newUrl);
            }
        }
        catch (Exception e)
        {
            string msg = e.Message;
            _logger?.LogError("[Exception] DAT SMS Sync {Url}: {msg}", newUrl, msg);
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        _timer?.Dispose();
        _cts.Dispose();
        _lock.Dispose();
    }

    public static DatCmsManagerBuilder Builder() => new();

    public class DatCmsManagerBuilder
    {
        private HttpClient _client = new();
        private Uri _uri = new("http://localhost:8088");
        private string _token = "";
        private bool _verifyOnly = false;
        private long _intervalSeconds = 60L;
        private ILogger? _logger;

        public DatCmsManagerBuilder Client(HttpClient client)
        {
            _client = client;
            return this;
        }

        public DatCmsManagerBuilder Uri(string uri)
        {
            _uri = new Uri(uri);
            return this;
        }

        public DatCmsManagerBuilder Host(string host)
        {
            var builder = new UriBuilder(_uri) { Host = host };
            _uri = builder.Uri;
            return this;
        }

        public DatCmsManagerBuilder Port(int port)
        {
            var builder = new UriBuilder(_uri) { Port = port };
            _uri = builder.Uri;
            return this;
        }

        public DatCmsManagerBuilder Token(string token)
        {
            _token = token;
            return this;
        }

        public DatCmsManagerBuilder VerifyOnly(bool verifyOnly)
        {
            _verifyOnly = verifyOnly;
            return this;
        }

        public DatCmsManagerBuilder IntervalSeconds(long intervalSeconds)
        {
            _intervalSeconds = intervalSeconds;
            return this;
        }

        public DatCmsManagerBuilder IntervalOff()
        {
            _intervalSeconds = 0;
            return this;
        }

        public DatCmsManagerBuilder Logger(ILogger? logger)
        {
            _logger = logger;
            return this;
        }

        public async Task<DatCmsManager> BuildAsync()
        {
            if (_uri.AbsolutePath.Length > 1)
            {
                throw new DatException($"uri must be path-less: {_uri}");
            }
            if (!string.IsNullOrEmpty(_uri.Query))
            {
                throw new DatException($"uri must be query-less: {_uri}");
            }

            string path = _verifyOnly ? $"/{DatCmsApiVersion}/certs/verify-only" : $"/{DatCmsApiVersion}/certs";
            string uriStr = $"{_uri.Scheme}://{_uri.Host}:{_uri.Port}{path}";

            var manager = DatManager.NewInstance();
            var cms = new DatCmsManager(uriStr, _token, 0, manager, _client, _intervalSeconds, _logger);

            await cms.Sync();

            return cms;
        }
    }
}
