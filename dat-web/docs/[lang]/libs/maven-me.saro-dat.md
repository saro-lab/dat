# DAT Java, Kotlin Library
<GithubBadge label="GitHub" /> <RegistryBadge />
- [Java Test Code](https://github.com/saro-lab/dat/tree/master/dat-maven/src/test/java/test/java)
- [Kotlin Test Code](https://github.com/saro-lab/dat/tree/master/dat-maven/src/test/kotlin/test/kt)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>

> **Requires:** JVM >= 17


## Java {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: ExampleCmsManagerTest.java](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/java/test/java/ExampleCmsManagerTest.java)
```java
// singleton
DatCmsManager manager = DatCmsManager.builder()
        .uri("http://localhost:8088")
        //.intervalOff() // disable auto sync
        .intervalSeconds(60)
        .token("12345678901b")
        .build();

// manual sync
// manager.sync();

String plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
String secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

System.out.println("plain : " + plain);
System.out.println("secure : " + secure);

// issue dat
String dat = manager.issue(plain, secure).getOrThrow();
System.out.println("dat : " + dat);

// parse dat
Payload payload = manager.parse(dat).getOrThrow();

String payloadPlain = payload.getPlain();
String payloadSecure = payload.getSecure();

System.out.println("payload plain : " + payloadPlain);
System.out.println("payload secure : " + payloadSecure);
```

#### {{t('manual_code')}}
- [{{t('example')}}: ExampleTest.java](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/java/test/java/ExampleTest.java)
- [{{t('example')}}: ManagerTest.java](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/java/test/java/ManagerTest.java)
- [{{t('example')}}: HardTest.java](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/java/test/java/HardTest.java)
```java
DatManager manager = DatManager.newInstance();

// Unixtime.now() is in SECONDS. Passing System.currentTimeMillis() here would
// place the certificate ~55,000 years in the future and it would never be issuable.
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

String plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
String secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

var newDat = manager.issue(plain, secure).getOrThrow();
Payload newPayload = manager.parse(newDat).getOrThrow();
assert plain.equals(newPayload.getPlain());
assert secure.equals(newPayload.getSecure());
```

#### {{t('error_handling')}}

`issue` and `parse` return `DatResult`, so a failure is a value rather than a
thrown exception. `getOrThrow()` turns it into a `DatException`, whose `errorCode`
is identical across all official clients.

```java
DatResult<Payload> result = manager.parse(dat);

if (result.exceptionOrNull() instanceof DatException e) {
    switch (e.getErrorCode()) {
        case TOKEN_EXPIRED ->
            // Normal end of life. Ask the client to get a fresh token.
            redirectToLogin();
        case SIG_MISMATCH -> {
            // Forgery: the signature does not belong to this certificate.
            // e.getSecurityEvent() is true here.
            securityLog.warn("forged dat: {}", e.getCode());
            terminateSession();
        }
        // Anything else is a bad request. Reject it.
        default -> render400(e.getCode());
    }
    return;
}
Payload payload = result.getOrThrow();
```

`getRetry()` collapses every code into one of three decisions, so callers never
have to keep their own list. Only `TRANSIENT` is worth retrying.

```java
DatResult<String> issued = manager.issue(plain, secure);

if (issued.exceptionOrNull() instanceof DatException e) {
    switch (e.getRetry()) {
        // e.g. the issuance window has not opened yet
        case TRANSIENT -> scheduleRetryWithBackoff();
        // config or deployment is wrong — retrying will not help
        case PERMANENT -> alertOperations(e.getCode());
        // not an error, just a signal
        case STATE -> { }
    }
}
```

A failed sync never throws — the manager is still returned so it can recover on a
later cycle. Poll `lastError()` instead: anything other than `null` means
certificates are no longer being refreshed.

```java
DatException err = manager.lastError();

// DAT_CMS_NOT_SYNCED until the first sync succeeds.
if (err != null && err.getRetry() == DatRetry.PERMANENT) {
    // A token or URL is wrong; no amount of waiting fixes it.
    alertOperations(err.getCode());
}
```

## Kotlin {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: ExampleCmsManagerTest.kt](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/kotlin/test/kt/ExampleCmsManagerTest.kt)
```kt
// singleton
val manager = DatCmsManager.builder()
    .uri("http://localhost:8088")
    //.intervalOff() // disable auto sync
    .intervalSeconds(60)
    .token("12345678901b")
    .build()

// manual sync
// manager.sync();

val plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
val secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

println("plain : " + plain)
println("secure : " + secure)

// issue dat
val dat = manager.issue(plain, secure).getOrThrow()
println("dat : " + dat)

// parse dat
val payload = manager.parse(dat).getOrThrow()

val payloadPlain = payload.plain
val payloadSecure = payload.secure

println("payload plain : " + payloadPlain)
println("payload secure : " + payloadSecure)
```

#### {{t('manual_code')}}
- [{{t('example')}}: ExampleTest.kt](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/kotlin/test/kt/ExampleTest.kt)
- [{{t('example')}}: ManagerTest.kt](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/kotlin/test/kt/ManagerTest.kt)
- [{{t('example')}}: HardTest.kt](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/kotlin/test/kt/HardTest.kt)
```kt
val manager = DatManager.newInstance()

// Unixtime.now() is in SECONDS — do not pass System.currentTimeMillis() here.
val unixTime = now()

// (cid, issuanceStart, issuanceDuration, datTtl, signatureAlgorithm, cryptoAlgorithm)
manager.imports(List.of(DatCertificate.generate(
    1,
    unixTime - 10,
    3600,
    1800,
    DatSignatureAlgorithm.HMAC_SHA384_MFS,
    DatCryptoAlgorithm.IV_AES256_GCM
)), true)


val plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
val secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

val newDat = manager.issue(plain, secure).getOrThrow()
val newPayload = manager.parse(newDat).getOrThrow()
assert(plain == newPayload.plain)
assert(secure == newPayload.secure)
```

#### export (verify only)
```kt
// ECDSA certificates export the public key only.
val verifyOnlyFormat = manager.exports(true)

// DatCertificate.supportVerifyOnly() answers whether the signature algorithm
// has a verify-only form at all: true for ECDSA, false for HMAC.
// HMAC is symmetric, so exports(true) fails with DAT_KEY_VERIFY_ONLY_UNSUPPORTED
// when an HMAC certificate is held.
```

#### {{t('error_handling')}}
- [{{t('example')}}: ErrorCodeTest.kt](https://github.com/saro-lab/dat/blob/master/dat-maven/src/test/kotlin/test/kt/ErrorCodeTest.kt)

`issue` and `parse` return `DatResult`, so a failure is a value rather than a
thrown exception. The `errorCode` on `DatException` is identical across all
official clients.

```kt
when (val e = manager.parse(dat).exceptionOrNull()) {
    null -> handle(manager.parse(dat).getOrThrow())
    is DatException -> when (e.errorCode) {
        // Normal end of life. Ask the client to get a fresh token.
        DatErrorCode.TOKEN_EXPIRED -> redirectToLogin()
        // Forgery: the signature does not belong to this certificate.
        // e.securityEvent is true here.
        DatErrorCode.SIG_MISMATCH -> {
            securityLog.warn("forged dat: {}", e.code)
            terminateSession()
        }
        // Anything else is a bad request. Reject it.
        else -> render400(e.code)
    }
    else -> throw e
}
```

`retry` collapses every code into one of three decisions, so callers never have
to keep their own list. Only `TRANSIENT` is worth retrying.

```kt
val e = manager.issue(plain, secure).exceptionOrNull() as? DatException

when (e?.retry) {
    // e.g. the issuance window has not opened yet
    DatRetry.TRANSIENT -> scheduleRetryWithBackoff()
    // config or deployment is wrong — retrying will not help
    DatRetry.PERMANENT -> alertOperations(e.code)
    // not an error, just a signal
    DatRetry.STATE, null -> Unit
}
```

The reason behind `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` travels on `cause`, because
the four causes need different responses — only the first one clears on its own.

```kt
val cause = (e?.cause as? DatException)?.errorCode
when (cause) {
    DatErrorCode.CERT_NOT_YET_ISSUABLE -> waitForWindow()   // opens shortly
    DatErrorCode.CERT_ISSUANCE_ENDED,
    DatErrorCode.CERT_EXPIRED -> rolloutNewCertificate()
    DatErrorCode.CERT_VERIFY_ONLY -> fixDeployment()        // issuer got a verify-only cert
    else -> Unit
}
```

A failed sync never throws — the manager is still returned so it can recover on a
later cycle. Poll `lastError()` instead: anything other than `null` means
certificates are no longer being refreshed.

```kt
// DAT_CMS_NOT_SYNCED until the first sync succeeds.
manager.lastError()?.let { err ->
    // PERMANENT means a token or URL is wrong; no amount of waiting fixes it.
    if (err.retry == DatRetry.PERMANENT) alertOperations(err.code)
}
```



<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import RegistryBadge from '../../.vitepress/ui/RegistryBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Maven', 'me.saro:dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
