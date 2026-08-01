using Microsoft.Extensions.Logging;
namespace Saro.Dat;

public class DatCmsManager : IDisposable
{
    private readonly string _uri;
    private string _token;
    private long _version;
    private readonly DatManager _manager;
    private readonly HttpClient _client;
    // Only a client this instance created is disposed; an injected one belongs to
    // the caller and is very likely shared.
    private readonly bool _ownsClient;
    private readonly PeriodicTimer? _timer;
    private readonly CancellationTokenSource _cts = new();
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger? _logger;
    private int _disposed;
    // 마지막 동기화 실패. 최초 sync 실패를 삼키고 "인증서 0개 매니저"를 성공 반환하던
    // 동작은 그대로 두되(list.md F-3), 실패가 로그로만 남던 것을 조회 가능하게 한다.
    // 실측 결과 401·500·응답 손상 8/8 시나리오에서 BuildAsync 가 무증상이었다.
    private volatile DatException? _lastError = new(DatErrorCode.CmsNotSynced);

    private const string DatCmsApiVersion = "v1";

    private DatCmsManager(
        string uri,
        string token,
        long version,
        DatManager manager,
        HttpClient client,
        bool ownsClient,
        long intervalSeconds,
        ILogger? logger)
    {
        _uri = uri;
        _token = token;
        _version = version;
        _manager = manager;
        _client = client;
        _ownsClient = ownsClient;
        _logger = logger;

        if (intervalSeconds > 0)
        {
            _timer = new PeriodicTimer(TimeSpan.FromSeconds(intervalSeconds));
            _ = RunSyncLoop();
        }
    }

    public DatManager GetManager() => _manager;

    /// <summary>
    /// 마지막 동기화 실패. 한 번도 성공하지 못했으면 DAT_CMS_NOT_SYNCED, 정상이면 null.
    /// 재시도 여부는 <c>LastError?.Retry</c> 로 판정한다.
    /// </summary>
    public DatException? LastError => _lastError;

    public long GetVersion() => Interlocked.Read(ref _version);

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
        try
        {
            await SyncOrThrow();
            _lastError = null;
        }
        catch (DatException e)
        {
            // 상태 신호는 실패로 기록하지 않는다 — 이전 동기화가 도는 중일 뿐이다.
            if (e.Retry == DatRetry.State)
            {
                _logger?.LogDebug("{Code}: {Url}", e.Code, _uri);
                return;
            }
            _lastError = e;
            _logger?.LogError("[CRITICAL] DAT CMS SYNC {Url}: {Code} {msg}", _uri, e.Code, e.Message);
        }
        catch (OperationCanceledException)
        {
            // 종료 중이다. 실패로 기록하지 않는다.
        }
        catch (Exception e)
        {
            var wrapped = new DatException(DatErrorCode.CmsUnknown, "unclassified cms failure", e);
            _lastError = wrapped;
            _logger?.LogError("[CRITICAL] DAT CMS SYNC {Url}: {Code} {msg}", _uri, wrapped.Code, e.Message);
        }
    }

    /// <summary>
    /// 실패를 코드로 던진다. <see cref="Sync"/> 는 이것을 잡아 <see cref="LastError"/> 에
    /// 담기만 한다 — BuildAsync 가 계속 성공 반환하는 기존 동작을 유지하기 위해서다.
    /// </summary>
    private async Task SyncOrThrow()
    {
        if (!await _lock.WaitAsync(0))
        {
            throw new DatException(DatErrorCode.CmsSyncInProgress);
        }

        long version = Interlocked.Read(ref _version);
        string newUrl = $"{_uri}?version={version}";
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, newUrl);
            request.Headers.Add("Authorization", _token);

            HttpResponseMessage response;
            try
            {
                response = await _client.SendAsync(request, _cts.Token);
            }
            catch (HttpRequestException e)
            {
                // DNS 실패·연결 거부·TLS 실패가 전부 여기로 온다. 전부 일시적이다.
                throw new DatException(DatErrorCode.CmsUnreachable, $"cannot reach {_uri}", e);
            }
            catch (TaskCanceledException e) when (!_cts.IsCancellationRequested)
            {
                // 취소가 아니라 타임아웃이다.
                throw new DatException(DatErrorCode.CmsUnreachable, $"request to {_uri} timed out", e);
            }

            using (response)
            {
                // HTTP 상태를 갈라 낸다. 예전에는 전부 하나의 문자열이라 401(영구)에도
                // 60초마다 영원히 재시도했다.
                if (!response.IsSuccessStatusCode)
                {
                    throw HttpStatusError((int)response.StatusCode);
                }

                string body = await response.Content.ReadAsStringAsync(_cts.Token);
                int iof = body.IndexOf('\n');

                if (iof == 0)
                {
                    throw new DatException(DatErrorCode.CmsMalformed, "response has no version line");
                }

                if (iof > 0)
                {
                    string versionLine = body[..iof].Trim();
                    if (!long.TryParse(versionLine, System.Globalization.NumberStyles.None,
                            System.Globalization.CultureInfo.InvariantCulture, out long newVersion))
                    {
                        throw new DatException(DatErrorCode.CmsMalformed, "version line is not a plain decimal integer");
                    }

                    // 서버가 우리보다 과거 버전을 돌려주면 전체 재동기화 지시다.
                    if (newVersion < version)
                    {
                        _logger?.LogWarning("{Code}: {from} -> {to}", DatErrorCode.CmsVersionReset, version, newVersion);
                    }

                    string newCertificates = body[(iof + 1)..].Trim();
                    int renewCount;
                    try
                    {
                        renewCount = _manager.Imports(newCertificates, false);
                    }
                    catch (DatException e)
                    {
                        // 인증서 적용 실패의 원인(CERT_*/KEY_*)을 버리지 않고 체이닝한다.
                        throw new DatException(DatErrorCode.CmsImportFailed, "cannot apply received certificates", e);
                    }

                    Interlocked.Exchange(ref _version, newVersion);
                    _logger?.LogInformation("renew {renewCount} certificates: {Url}", renewCount, newUrl);
                }
                else
                {
                    _logger?.LogDebug("no new certificate: {Url}", newUrl);
                }
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    private static DatException HttpStatusError(int status) => status switch
    {
        401 => new DatException(DatErrorCode.CmsUnauthorized, "http 401"),
        403 => new DatException(DatErrorCode.CmsForbidden, "http 403"),
        404 => new DatException(DatErrorCode.CmsEndpointNotFound, "http 404"),
        >= 500 and <= 599 => new DatException(DatErrorCode.CmsServerError, $"http {status}"),
        _ => new DatException(DatErrorCode.CmsHttpStatus, $"http {status}")
    };

    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) != 0) return;

        _cts.Cancel();
        _timer?.Dispose();
        _cts.Dispose();
        _lock.Dispose();
        // The manager and its certificates were created here, so their native key
        // handles are released here too.
        _manager.Dispose();
        if (_ownsClient) _client.Dispose();
    }

    public static DatCmsManagerBuilder Builder() => new();

    public class DatCmsManagerBuilder
    {
        // null until injected: the default client is created in BuildAsync so the
        // built manager knows it owns it.
        private HttpClient? _client;
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
            try
            {
                _uri = new Uri(uri);
            }
            catch (UriFormatException e)
            {
                throw new DatException(DatErrorCode.ConfigUriInvalid, "cannot be parsed as a uri", e);
            }
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
            if (_uri.Scheme != "http" && _uri.Scheme != "https")
            {
                throw new DatException(DatErrorCode.ConfigUriInvalid, $"scheme must be http or https: {_uri}");
            }
            if (_uri.AbsolutePath.Length > 1)
            {
                throw new DatException(DatErrorCode.ConfigUriInvalid, $"must be path-less: {_uri}");
            }
            if (!string.IsNullOrEmpty(_uri.Query))
            {
                throw new DatException(DatErrorCode.ConfigUriInvalid, $"must be query-less: {_uri}");
            }

            string path = _verifyOnly ? $"/{DatCmsApiVersion}/certs/verify-only" : $"/{DatCmsApiVersion}/certs";
            string uriStr = $"{_uri.Scheme}://{_uri.Host}:{_uri.Port}{path}";

            bool ownsClient = _client == null;
            var client = _client ?? new HttpClient();

            var manager = DatManager.NewInstance();
            var cms = new DatCmsManager(uriStr, _token, 0, manager, client, ownsClient, _intervalSeconds, _logger);

            await cms.Sync();

            return cms;
        }
    }
}
