# DAT for C#

Package: `saro-dat` | namespace `Saro.Dat` | targets `net8.0` / `net10.0` | source: `dat-nuget/`

## Install

```sh
dotnet add package saro-dat --version 4.6.1
```

```powershell
Install-Package saro-dat -Version 4.6.1
```

## Everything crypto-holding is `IDisposable`

`DatManager`, `DatCmsManager`, `DatCertificate` and the signature types hold native crypto handles.
Dispose them, or wrap them in `using`. Using a disposed manager gives you
`DAT_MANAGER_DISPOSED`.

In an ASP.NET Core app, register the manager as a singleton and let the container dispose it:

```cs
builder.Services.AddSingleton(_ => DatCmsManager.Builder()
    .Host("cms.internal").Port(8088)
    .Token(builder.Configuration["Dat:Token"]!)
    .IntervalSeconds(60)
    .BuildAsync().GetAwaiter().GetResult());
```

## With a CMS (production)

```cs
// singleton - dispose on shutdown (stops the sync loop and releases the HttpClient)
DatCmsManager manager = await DatCmsManager.Builder()
    .Host("localhost")
    .Port(8088)
    // .Uri("http://localhost:8088")  // equivalent
    .Token("12345678901b")
    // .VerifyOnly(true)  // only when a separate service does the issuing
    // .IntervalOff()      // no background timer; call Sync() yourself
    .IntervalSeconds(60)
    // .Logger(logger)
    .BuildAsync();

// BuildAsync always returns a manager, even when the first sync failed - it becomes
// usable once the network recovers. Ask separately whether it synced.
DatException? syncError = manager.LastError;
if (syncError is not null)
{
    // A permanent failure (bad token, wrong URL) will never resolve on its own.
    Console.WriteLine($"initial sync failed: {syncError.Code} (retry={syncError.Retry})");
}
Console.WriteLine($"synced version: {manager.GetVersion()}");
```

`Uri` must be scheme + host + port - no path, no query. `Host`/`Port` build the same thing.
`await manager.Sync()` forces a cycle; `manager.GetManager()` reaches the inner `DatManager`.
`.Client(httpClient)` lets you supply your own `HttpClient`.

## Issue and parse

```cs
string plain = "42|acme|admin";
string secure = "42|s-91af|billing:rw";

string dat = manager.Issue(plain, secure);

Payload payload = manager.Parse(dat);
string payloadPlain = payload.Plain;
string payloadSecure = payload.Secure;
```

`Issue` and `Parse` are **synchronous**; only `Sync()` and `BuildAsync()` are async. `Payload` also
exposes `PlainBytes` / `SecureBytes`, and `Issue` has a `byte[]` overload.

## Without a CMS

```cs
using var datManager = DatManager.NewInstance();

// (cid, issuanceStart, issuanceDuration, datTtl, signatureAlgorithm, cryptoAlgorithm)
long now = Unixtime.Now();
using var cert = DatCertificate.Generate(
    0,
    now - 10,
    7200,
    1800,
    DatSignatureAlgorithm.EcdsaP256,
    DatCryptoAlgorithm.IvAes128Gcm
);

// Imports copies the certificates, so the caller keeps ownership of `cert`.
datManager.Imports(new List<DatCertificate> { cert }, false);

string dat = datManager.Issue(plain, secure);
Payload payload = datManager.Parse(dat);
```

`Unixtime.Now()` returns **seconds**. The third argument is a duration, not an end time.

Enums: `DatSignatureAlgorithm.{EcdsaP256, EcdsaP384, EcdsaP521, HmacSha256Mfs, HmacSha384Mfs,
HmacSha512Mfs}`, `DatCryptoAlgorithm.{IvAes128Gcm, IvAes256Gcm}`.

## `DatManager` surface

| Method | Returns |
| --- | --- |
| `NewInstance()` | `DatManager` |
| `Issue(string, string)` / `Issue(byte[], byte[])` | `string` |
| `Parse(string)` / `Parse(Dat)` | `Payload` |
| `ParseWithoutVerifying(..)` | `Payload` - **logging only** |
| `Imports(List<DatCertificate>, bool clear)` | `int` |
| `Imports(string format, bool clear)` | `int` - text format |
| `Exports(bool verifyOnly)` | `string` |
| `ExportsCertificates()` | `List<DatCertificate>` |
| `ExportsIds()` | `List<long>` |

`DatCmsManager` adds `Sync()`, `LastError`, `GetVersion()`, `GetManager()` and forwards the
issue/parse family.

## Error handling

Every failure is a `DatException` carrying a `Code`. The string is the contract; the message is
free to change. `DatErrorCode` is a static class of those strings.

```cs
// Expiry, forgery and malformed input each need a different response.
try
{
    Payload payload = manager.Parse(dat);
}
catch (DatException e) when (e.Code == DatErrorCode.TokenExpired)
{
    // Normal end of life - let the client refresh its token.
}
catch (DatException e) when (e.SecurityEvent)
{
    // DAT_SIG_MISMATCH or DAT_CRYPTO_TAG_MISMATCH: forged or tampered with.
    Console.Error.WriteLine($"[SECURITY] {e.Code}");
}
catch (DatException e)
{
    // Anything else: just reject the request.
    Console.Error.WriteLine($"rejected: {e.Code}");
}
```

```cs
try
{
    string dat = manager.Issue(plain, secure);
}
catch (DatException e)
{
    // Never retry a permanent failure - it will not resolve on its own.
    if (e.Retry == DatRetry.Transient)
    {
        // back off, then retry
    }

    // Why issuing failed is chained, not folded into the outer code.
    // Waiting helps for DAT_CERT_NOT_YET_ISSUABLE and nothing else.
    if (e.Code == DatErrorCode.ManagerNoIssuableCertificate)
    {
        Console.Error.WriteLine($"cannot issue: {DatException.CodeOf(e.InnerException)}");
    }
}
```

`DatException.CodeOf(Exception?)` returns the code string of any exception that happens to be a
`DatException`, or `null` - convenient for reading a chained cause without casting.

Full code table: [errors.md](https://dat.saro.me/llms/errors.md).

## Minimal API middleware

```cs
app.Use(async (ctx, next) =>
{
    var header = ctx.Request.Headers.Authorization.ToString();
    if (!header.StartsWith("Bearer "))
    {
        ctx.Response.StatusCode = 401;
        return;
    }
    try
    {
        ctx.Items["dat"] = manager.Parse(header[7..]);
    }
    catch (DatException e)
    {
        if (e.SecurityEvent) securityLog.LogWarning("forged dat {Code}", e.Code);
        ctx.Response.StatusCode = 401;
        return;
    }
    await next();
});
```

## Notes

- One manager per process, resolved from DI. Never build one per request.
- Test code worth reading: `dat-nuget/Saro.Dat.Tests/ExampleCmsManagerTest.cs`, `ExampleTest.cs`,
  `HardTest.cs`, `ErrorCodeTest.cs`.
