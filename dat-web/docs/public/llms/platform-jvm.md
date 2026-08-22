# DAT for Java and Kotlin

Artifact: `me.saro:dat` | JVM >= 17 | source: `dat-maven/`

The library is written in Kotlin and is idiomatic from both languages. Java sees getters
(`payload.getPlain()`); Kotlin sees properties (`payload.plain`).

## Install

```kotlin
// build.gradle.kts
implementation("me.saro:dat:4.6.2")
```

```xml
<dependency>
    <groupId>me.saro</groupId>
    <artifactId>dat</artifactId>
    <version>4.6.2</version>
</dependency>
```

## Failures are values, not exceptions

`issue` and `parse` return `DatResult<T>`:

| Call | Gives you |
| --- | --- |
| `getOrThrow()` | the value, or throws `DatException` |
| `getOrNull()` | the value, or `null` |
| `getOrElse { ... }` | the value, or a fallback |
| `exceptionOrNull()` | the `Throwable`, or `null` |
| `map { ... }` / `fold { ... }` | chaining without unwrapping |
| `toResult()` | Kotlin's own `Result<T>` |

`getOrThrow()` is fine at the edge of your code; branch on `exceptionOrNull()` where you need to
tell failures apart.

## With a CMS (production)

```java
// singleton - one per process
DatCmsManager manager = DatCmsManager.builder()
        .uri("http://localhost:8088")
        .token("12345678901b")
        // .verifyOnly(true)  // only when a separate service does the issuing
        // .intervalOff()      // no background timer; call sync() yourself
        .intervalSeconds(60)
        .build();

// A failed first sync never throws - the manager is returned so it can recover
// on a later cycle. Anything other than null means certificates are stale.
DatException err = manager.lastError();
if (err != null && err.getRetry() == DatRetry.PERMANENT) {
    alertOperations(err.getCode());   // a token or URL is wrong; waiting will not fix it
}
```

```kotlin
val manager = DatCmsManager.builder()
    .uri("http://localhost:8088")
    .token("12345678901b")
    .intervalSeconds(60)
    .build()

manager.lastError()?.let { err ->
    if (err.retry == DatRetry.PERMANENT) alertOperations(err.code)
}
```

The URI must be scheme + host + port - no path, no query. `manager.sync()` forces a cycle;
`manager.getVersion()` reports the synced version; `manager.getManager()` reaches the inner
`DatManager`.

## Issue and parse

```java
String plain = "42|acme|admin";
String secure = "42|s-91af|billing:rw";

String dat = manager.issue(plain, secure).getOrThrow();

Payload payload = manager.parse(dat).getOrThrow();
String payloadPlain = payload.getPlain();
String payloadSecure = payload.getSecure();
```

```kotlin
val dat = manager.issue(plain, secure).getOrThrow()
val payload = manager.parse(dat).getOrThrow()
val payloadPlain = payload.plain
val payloadSecure = payload.secure
```

`Payload` also exposes `plainBytes` / `secureBytes` for non-text payloads. Both `issue` and `parse`
have `ByteArray` overloads.

## Without a CMS

```java
DatManager manager = DatManager.newInstance();

// Unixtime.now() is in SECONDS. Passing System.currentTimeMillis() here would place
// the certificate ~55,000 years in the future and it would never be issuable.
long unixTime = Unixtime.now();

// (cid, issuanceStart, issuanceDuration, datTtl, signatureAlgorithm, cryptoAlgorithm)
manager.imports(List.of(DatCertificate.generate(
        0,
        unixTime - 10,
        3600,
        1800,
        DatSignatureAlgorithm.ECDSA_P256,
        DatCryptoAlgorithm.IV_AES256_GCM
)), false);

String dat = manager.issue(plain, secure).getOrThrow();
Payload payload = manager.parse(dat).getOrThrow();
```

```kotlin
val manager = DatManager.newInstance()
val unixTime = Unixtime.now()

manager.imports(listOf(DatCertificate.generate(
    1, unixTime - 10, 3600, 1800,
    DatSignatureAlgorithm.HMAC_SHA384_MFS,
    DatCryptoAlgorithm.IV_AES256_GCM
)), true)
```

`me.saro.dat.Unixtime.now()` returns **seconds**. The third argument is a duration, not an end
time.

Enums: `DatSignatureAlgorithm.{ECDSA_P256, ECDSA_P384, ECDSA_P521, HMAC_SHA256_MFS,
HMAC_SHA384_MFS, HMAC_SHA512_MFS}`, `DatCryptoAlgorithm.{IV_AES128_GCM, IV_AES256_GCM}`.

## `DatManager` surface

| Method | Returns |
| --- | --- |
| `newInstance()` | `DatManager` |
| `issue(String, String)` / `issue(ByteArray, ByteArray)` | `DatResult<String>` |
| `parse(String?)` / `parse(Dat)` | `DatResult<Payload>` |
| `parseWithoutVerifying(..)` | `DatResult<Payload>` - **logging only** |
| `imports(List<DatCertificate>, Boolean)` | `Int` |
| `imports(String, Boolean)` | `Int` - text format |
| `exports(Boolean)` | `String` |
| `exportsCertificates()` | `List<DatCertificate>` |
| `exportsIds()` | `List<Long>` |

`DatCmsManager` adds `sync()`, `lastError()`, `getVersion()`, `getManager()` and forwards the
issue/parse family.

## Verify-only export

```kotlin
// ECDSA certificates export the public key only.
val verifyOnlyFormat = manager.exports(true)

// certificate.supportVerifyOnly() answers whether the algorithm has a verify-only
// form at all: true for ECDSA, false for HMAC. Calling exports(true) while holding an
// HMAC certificate fails with DAT_KEY_VERIFY_ONLY_UNSUPPORTED.
```

## Error handling

```java
DatResult<Payload> result = manager.parse(dat);

if (result.exceptionOrNull() instanceof DatException e) {
    switch (e.getErrorCode()) {
        case TOKEN_EXPIRED ->
            redirectToLogin();                       // normal end of life
        case SIG_MISMATCH -> {
            securityLog.warn("forged dat: {}", e.getCode());  // e.getSecurityEvent() is true
            terminateSession();
        }
        default -> render400(e.getCode());           // anything else is a bad request
    }
    return;
}
Payload payload = result.getOrThrow();
```

```kotlin
when (val e = manager.parse(dat).exceptionOrNull()) {
    null -> handle(manager.parse(dat).getOrThrow())
    is DatException -> when (e.errorCode) {
        DatErrorCode.TOKEN_EXPIRED -> redirectToLogin()
        DatErrorCode.SIG_MISMATCH -> { securityLog.warn("forged dat: {}", e.code); terminateSession() }
        else -> render400(e.code)
    }
    else -> throw e
}
```

`retry` collapses every code into one of three decisions, so callers never keep their own list.
Only `TRANSIENT` is worth retrying.

```kotlin
val e = manager.issue(plain, secure).exceptionOrNull() as? DatException

when (e?.retry) {
    DatRetry.TRANSIENT -> scheduleRetryWithBackoff()   // e.g. the window has not opened yet
    DatRetry.PERMANENT -> alertOperations(e.code)      // config or deployment is wrong
    DatRetry.STATE, null -> Unit                       // not an error
}
```

The reason behind `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` travels on `cause`, because the four causes
need different responses - only the first one clears on its own.

```kotlin
val cause = (e?.cause as? DatException)?.errorCode
when (cause) {
    DatErrorCode.CERT_NOT_YET_ISSUABLE -> waitForWindow()   // opens shortly
    DatErrorCode.CERT_ISSUANCE_ENDED,
    DatErrorCode.CERT_EXPIRED -> rolloutNewCertificate()
    DatErrorCode.CERT_VERIFY_ONLY -> fixDeployment()        // issuer got a verify-only cert
    else -> Unit
}
```

`DatException` exposes `errorCode` (the enum), `code` (the stable string), `retry`, and
`securityEvent`. Branch on the enum in Kotlin's `when`; use the string for logs and metrics.

Full code table: [errors.md](https://dat.saro.me/llms/errors.md).

## Notes

- One manager per process. It holds a background scheduler and every certificate.
- Depends on BouncyCastle (`bcprov-jdk18on`) and the SLF4J API. Provide an SLF4J binding to see
  sync logs.
- Test code worth reading: `dat-maven/src/test/java/test/java/` and
  `dat-maven/src/test/kotlin/test/kt/` - `ExampleCmsManagerTest`, `ManagerTest`, `HardTest`,
  `ErrorCodeTest`.
