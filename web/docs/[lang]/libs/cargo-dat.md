# DAT Rust Library
- [Github](https://github.com/saro-lab/dat-rust) / [Test Code](https://github.com/saro-lab/dat-rust/blob/master/tests/)


## {{t('example')}}: {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: example_cms_manager_test.rs](https://github.com/saro-lab/dat-rust/blob/master/tests/example_cms_manager_test.rs)
##### {{t('repository')}}
<CodeBox lang="toml" :code="cmsRepo"/>

##### init

```rust
static DAT_CMS_MANAGER: OnceLock<Arc<DatCmsManager>> = OnceLock::new();

#[inline]
pub fn get_cms_manager() -> Result<Arc<DatCmsManager>, DatError> {
    DAT_CMS_MANAGER.get()
        .map(|manager| Arc::clone(manager))
        .ok_or_else(|| DatError::EtcError("dat auto sync manager not initialized"))
}

pub fn init() {
    let manager = DatCmsManager::builder()
      .url("http://localhost:8088").unwrap()
      //.interval_off() // disable auto sync
      .interval(std::time::Duration::from_secs(60)) // auto sync interval 60 seconds
      //.token("12345678901b") // use access token
      .build().await;
    DAT_CMS_MANAGER.set(manager).map_err(|_| "failed to set auto sync manager".to_string()).unwrap()
    
    // manual sync
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

## {{t('example')}}: {{t('manual_code')}}
- [manager_test.rs](https://github.com/saro-lab/dat-rust/blob/master/tests/manager_test.rs)
- [hard_test.rs](https://github.com/saro-lab/dat-rust/blob/master/tests/hard_test.rs)

##### {{t('repository')}}

<LibUnit :lib="lib" class="no-title"/>

#### init
```rust
// create manager
let manager = DatManager::new();

// generate certificate
let now = now_unix_timestamp();
let certificate = DatCertificate::generate(0, now - 10, 200, 100, DatSignatureAlgorithm::HmacSha512Mfs, DatCryptoAlgorithm::IvAes256Gcm).unwrap();

// import certificate
manager.import_certificates(vec![certificate], false).unwrap();
```
#### issue / parse
```rust
let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

let dat = manager.issue(plain, secure)?;
let payload = manager.parse(dat)?;

assert_eq!(plain, payload.plain_text()?);
assert_eq!(secure, payload.secure_text()?);

println("PASS NEW DAT " + newDat)
println("PASS NEW PAYLOAD " + newPayload.toUnsafeString())
```

<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import CodeBox from '../../.vitepress/ui/CodeBox.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Cargo', 'dat');
const cmsRepo = `# features cms_manager with tracing log
dat = { version = "${lib.version}", features = ["full"] }
# features cms_manager
# dat = { version = "${lib.version}", features = ["dat_cms"] }`;
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
