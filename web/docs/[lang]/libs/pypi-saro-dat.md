# DAT Python Library
- [Github](https://github.com/saro-lab/dat-pypi) / [Test Code](https://github.com/saro-lab/dat-pypi/tree/master/tests)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>


## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: test_cms_manager.py](https://github.com/saro-lab/dat-pypi/blob/master/tests/test_cms_manager.py)
```python
manager = (
    DatCmsManager.builder()
    .uri("http://localhost:8088")
    .verify_only(False)
    #.interval_off() # disable auto sync
    .interval_seconds(60)
    .token("12345678901b")
    .build()
)

# manual sync
# manager.sync()

plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

print("plain : " + plain)
print("secure : " + secure)

# issue dat
dat = manager.issue(plain, secure)
print("dat : " + dat)

# parse dat
payload = manager.parse(dat)

payload_plain = payload.plain
payload_secure = payload.secure

print("payload plain : " + payload_plain)
print("payload secure : " + payload_secure)
``` 

#### {{t('manual_code')}}
- [{{t('example')}}: test_manager.py](https://github.com/saro-lab/dat-pypi/blob/master/tests/test_manager.py)
- [{{t('example')}}: test_hard.py](https://github.com/saro-lab/dat-pypi/blob/master/tests/test_hard.py)
```python
dat_manager = DatManager()

# create certificate
now = int(time.time())
cert = DatCertificate(0, DatSignature.generate(DatSignatureAlgorithm.ECDSA_P256), DatCrypto.generate(DatCryptoAlgorithm.IV_AES128_GCM), now - 10, now + 10, 1800)

# import certificate
dat_manager.import_certificates([cert])

plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

dat = dat_manager.issue(plain, secure)
payload = dat_manager.parse(dat)

assert payload.plain == plain
assert payload.secure == secure
print(f"PARSE DAT: {dat}")
print(f"plain: {payload.plain}")
print(f"secure: {payload.secure}")
```

<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Pypi', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>