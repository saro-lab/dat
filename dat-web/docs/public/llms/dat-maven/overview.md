# dat-maven Overview

This document targets DAT 4.7.x and later for the JVM (Java/Kotlin) DAT client. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible.

`dat-maven` implements the DAT wire protocol and DAT CMS v1 client contract described at [https://dat.saro.me/llms.txt](https://dat.saro.me/llms.txt). Read that document first for the non-negotiable protocol rules; this document and its siblings (`api.md`, `errors.md`, `integration.md`) cover only JVM-specific mechanics.

## Package identity

- Group: `me.saro`
- Artifact: `dat`
- Requires JVM 17 (`sourceCompatibility`/`targetCompatibility` = 17, Kotlin `jvmTarget` = 17).
- Runtime dependencies: `org.bouncycastle:bcprov-jdk18on` (signature/crypto backend), `org.slf4j:slf4j-api` (logging facade — bring an SLF4J binding).

```kotlin
// build.gradle.kts
dependencies {
    implementation("me.saro:dat:4.7.0")
}
```

```xml
<!-- pom.xml -->
<dependency>
  <groupId>me.saro</groupId>
  <artifactId>dat</artifactId>
  <version>4.7.0</version>
</dependency>
```

## Minimal usage

Issuing and verifying a DAT directly against one certificate (no CMS):

```kotlin
import me.saro.dat.dat.DatCertificate
import me.saro.dat.dat.DatManager

val certificate: DatCertificate = DatCertificate.parse(
    "a.0.32506363000.32506358400.HMAC-SHA256-MFS.IV-AES256-GCM.<sig-key>.<aes-key>"
)

val issued = DatManager.issue(certificate, "public-plain", "confidential-secure")
    .getOrThrow() // DatResult<String>

val payload = DatManager.parse(certificate, issued)
    .getOrThrow() // DatResult<Payload> — signature-verified before secure is decrypted
```

The CMS-backed manager (recommended when certificates are distributed by DAT CMS) is covered in `api.md`.

## Documentation map

- [API reference](./api.md): `DatManager`, `DatCmsManager`, `DatCmsManagerBuilder`, issue/parse/import/export surface.
- [Errors](./errors.md): `DatException`, `.code`/`.retry`/`.securityEvent`, and the full `DAT_*` catalog.
- [Integration checklist](./integration.md): JVM-specific role, lifecycle, and rotation checklist.
