# DAT Java, Kotlin Library
- [Github](https://github.com/saro-lab/dat-maven)
- [Java Test Code](https://github.com/saro-lab/dat-maven/tree/master/src/test/java/test/java)
- [Kotlin Test Code](https://github.com/saro-lab/dat-maven/tree/master/src/test/kotlin/test/kt)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>


## Java {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: ExampleCmsManagerTest.java](https://github.com/saro-lab/dat-maven/blob/master/src/test/java/test/java/ExampleCmsManagerTest.java)
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
- [{{t('example')}}: ManagerTest.java](https://github.com/saro-lab/dat-maven/blob/master/src/test/java/test/java/ManagerTest.java)
- [{{t('example')}}: HardTest.java](https://github.com/saro-lab/dat-maven/blob/master/src/test/java/test/java/HardTest.java)
```java
DatManager manager = DatManager.newInstance();
manager.imports(List.of(DatCertificate.generate(
        0,
        System.currentTimeMillis() - 10,
        200,
        100,
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

## Kotlin {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: ExampleCmsManagerTest.kt](https://github.com/saro-lab/dat-maven/tree/master/src/test/kotlin/test/kt/ExampleCmsManagerTest.kt)
```kt
// singleton
val manager = builder()
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
- [{{t('example')}}: ManagerTest.kt](https://github.com/saro-lab/dat-maven/tree/master/src/test/kotlin/test/kt/ManagerTest.kt)
- [{{t('example')}}: HardTest.kt](https://github.com/saro-lab/dat-maven/tree/master/src/test/kotlin/test/kt/HardTest.kt)
```kt
val manager = newInstance()

manager.imports(List.of(DatCertificate.generate(
    1,
    System.currentTimeMillis() - 10,
    200,
    100,
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



<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Maven', 'me.saro:dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
