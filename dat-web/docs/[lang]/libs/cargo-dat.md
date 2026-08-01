# DAT Rust Library
<GithubBadge label="GitHub" /> · [Test Code](https://github.com/saro-lab/dat/tree/master/dat-rust/tests)

> **Requires:** Rust edition 2024 · the `dat_cms` feature pulls in `tokio` + `reqwest`


## {{t('example')}}: {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: example_cms_manager_test.rs](https://github.com/saro-lab/dat/blob/master/dat-rust/tests/example_cms_manager_test.rs)
##### {{t('repository')}}
<CodeBox lang="toml" :code="cmsRepo"/>

##### init

```rust
use dat::cms_manager::DatCmsManager;
use dat::error::DatError;
use std::sync::{Arc, OnceLock};

static DAT_CMS_MANAGER: OnceLock<Arc<DatCmsManager>> = OnceLock::new();

#[inline]
pub fn get_cms_manager() -> Result<Arc<DatCmsManager>, DatError> {
    DAT_CMS_MANAGER.get()
        .map(|manager| Arc::clone(manager))
        .ok_or(DatError::InternalUnknown("dat auto sync manager not initialized"))
}

pub async fn init() {
    let manager = DatCmsManager::builder()
      .url("http://localhost:8088").unwrap()
      //.interval_off() // disable auto sync
      .interval(std::time::Duration::from_secs(60)) // auto sync interval 60 seconds
      //.token("12345678901b") // use access token
      .build().await;
    DAT_CMS_MANAGER.set(manager).map_err(|_| "failed to set auto sync manager".to_string()).unwrap();

    // `build()` hands back the manager even when the first sync failed, so that a
    // later tick can still recover. Ask for the failure instead of assuming success.
    if let Some(e) = get_cms_manager().unwrap().last_error().await {
        eprintln!("certificates are not being refreshed yet: {}", e.code());
    }

    // manual sync — returns Result<(), DatError>
    // get_cms_manager().unwrap().sync().await.unwrap();
}
```

##### issue / parse
```rust
let manager = get_cms_manager()?;

let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

let dat = manager.issue(plain, secure)?;

println!("dat: {:?}", dat);

let payload = manager.parse(dat)?;

assert_eq!(plain, payload.plain_text()?);
assert_eq!(secure, payload.secure_text()?);

println!("payload plain: {:?}", payload.plain_text()?);
println!("payload secure: {:?}", payload.secure_text()?);
```

##### {{t('error_handling')}}

```rust
use dat::error::{DatError, DatRetry};

// 1. Expiry, forgery and a malformed token each need a different response.
//    They used to share one value, so callers could not tell them apart.
match manager.parse(dat) {
    Ok(payload) => println!("plain: {}", payload.plain_text()?),
    // Normal end of life. Let the caller refresh and try again.
    Err(DatError::TokenExpired) => println!("expired: ask the client to re-issue"),
    // DAT_SIG_MISMATCH / DAT_CRYPTO_TAG_MISMATCH — direct evidence of tampering.
    Err(e) if e.security_event() => eprintln!("{}: drop the session", e.code()),
    // Anything else is simply a bad request.
    Err(e) => println!("rejected {}: {e}", e.code()),
}

// 2. Never retry a permanent failure. A wrong token answers 401 forever.
if let Err(e) = manager.sync().await {
    match e.retry() {
        DatRetry::Transient => eprintln!("{}: retrying on the next tick", e.code()),
        DatRetry::Permanent => eprintln!("{}: fix the token, url or deployment", e.code()),
        DatRetry::State => {} // not a failure — a sync was already running
    }
}

// 3. Sync failures never throw. Poll the manager to notice a stalled rollout.
if let Some(e) = manager.last_error().await {
    eprintln!("certificates are not being refreshed: {}", e.code());
}
```

- [{{t('menu_spec_errors')}}](../spec/errors)

## {{t('example')}}: {{t('manual_code')}}
- [manager_test.rs](https://github.com/saro-lab/dat/blob/master/dat-rust/tests/manager_test.rs)
- [hard_test.rs](https://github.com/saro-lab/dat/blob/master/dat-rust/tests/hard_test.rs)

##### {{t('repository')}}

<LibUnit :lib="lib" class="no-title"/>

#### init
```rust
// create manager
let manager = DatManager::new();

// generate certificate
// (cid, issuance_start, issuance_duration, dat_ttl, signature_alg, crypto_alg)
let now = now_unix_timestamp();
let certificate = DatCertificate::generate(0, now - 10, 3600, 1800, DatSignatureAlgorithm::HmacSha512Mfs, DatCryptoAlgorithm::IvAes256Gcm).unwrap();

// import certificate
manager.import_certificates(vec![certificate], false).unwrap();
```
#### issue / parse
```rust
let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

let dat = manager.issue(plain, secure)?;
println!("dat: {dat}");

let payload = manager.parse(dat)?;

assert_eq!(plain, payload.plain_text()?);
assert_eq!(secure, payload.secure_text()?);

println!("payload plain: {}", payload.plain_text()?);
println!("payload secure: {}", payload.secure_text()?);
```

<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import CodeBox from '../../.vitepress/ui/CodeBox.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Cargo', 'dat');
const cmsRepo = `# features cms_manager with tracing log
dat = { version = "${lib.version}", features = ["full"] }
# features cms_manager
# dat = { version = "${lib.version}", features = ["dat_cms"] }`;
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
