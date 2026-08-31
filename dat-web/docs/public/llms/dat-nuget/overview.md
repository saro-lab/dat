# saro-dat (C# / .NET) — Overview

This document targets DAT 4.7.x and later for the `dat-nuget` client (NuGet package `saro-dat`, namespace `Saro.Dat`, targets `net8.0`/`net10.0`). Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible. The full DAT wire protocol, certificate grammar, and CMS v1 contract are documented at [https://dat.saro.me/llms.txt](https://dat.saro.me/llms.txt) and apply unchanged to this client.

## Install

```shell
dotnet add package saro-dat
```

## Minimal usage

```csharp
using Saro.Dat;

// issuer/verifier certificate management via CMS
using var cms = await DatCmsManager.Builder()
    .Uri("http://localhost:8088")
    .Token("fullToken")
    .BuildAsync();

var manager = cms.GetManager();

// issue
string token = manager.Issue(plain: "route-id"u8.ToArray(), secure: "user-id=42"u8.ToArray());

// parse + verify
Payload payload = manager.Parse(token);
byte[] plainBytes = payload.PlainBytes;
byte[] secureBytes = payload.SecureBytes;
```

`DatCmsManager.BuildAsync()` performs a best-effort initial synchronization and always returns a usable manager; check `cms.LastError` to observe whether that attempt succeeded.

## Scope

- `Saro.Dat` implements DAT token issue/parse/verify and DAT certificate parse/export/import.
- `DatCmsManager` adds optional CMS v1 client synchronization: initial sync, periodic background sync, manual sync, and issuer selection.
- The library does not define identity claims, authorization semantics, or token transport; those are application responsibilities.

See [api.md](./api.md) for the exact API surface, [errors.md](./errors.md) for the full `DAT_*` error catalog, and [integration.md](./integration.md) for a C#-specific integration checklist.
