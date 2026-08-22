# DAT Python Library
<GithubBadge label="GitHub" /> <RegistryBadge /> · [Test Code](https://github.com/saro-lab/dat/tree/master/dat-pypi/tests)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>

> **Requires:** Python >= 3.10


## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: test_cms_manager.py](https://github.com/saro-lab/dat/blob/master/dat-pypi/tests/test_cms_manager.py)
```python
from saro_dat import DatCmsManager, DatRetry

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

# build() never raises on a failed first sync — it returns a manager with no
# certificates so a CMS outage cannot stop your app from starting.
# Ask for the reason instead:
sync_error = manager.last_error()
if sync_error is not None and sync_error.retry is DatRetry.PERMANENT:
    # Retrying will not help — the token or the URL is wrong.
    print("fix the CMS config:", sync_error.code)

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
- [{{t('example')}}: test_manager.py](https://github.com/saro-lab/dat/blob/master/dat-pypi/tests/test_manager.py)
- [{{t('example')}}: test_hard.py](https://github.com/saro-lab/dat/blob/master/dat-pypi/tests/test_hard.py)
```python
dat_manager = DatManager()

# create certificate
# (cid, issuance_start, issuance_duration, dat_ttl, signature, crypto)
now = int(time.time())
cert = DatCertificate(
    0,
    now - 10,
    3600,
    1800,
    DatSignature.generate(DatSignatureAlgorithm.ECDSA_P256),
    DatCrypto.generate(DatCryptoAlgorithm.IV_AES128_GCM),
)

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

#### export (verify only)
```python
# ECDSA certificates export the public key only.
verify_only_format = dat_manager.exports(True)

verifier = DatManager()
verifier.imports(verify_only_format)

# HMAC is a symmetric algorithm, so it has no verify-only form: exports(True)
# raises DatError with code DAT_KEY_VERIFY_ONLY_UNSUPPORTED when the manager
# holds an HMAC certificate.
```

#### {{t('error_handling')}}
- [{{t('example')}}: test_error_code.py](https://github.com/saro-lab/dat/blob/master/dat-pypi/tests/test_error_code.py)

Every failure is a `DatError` carrying a `code` that is identical across all official clients.
The one split that matters most: **an expired token is not a forged one.**

```python
from saro_dat import DatError, DatRetry, error as E

def verify(manager, dat):
    try:
        return manager.parse(dat)
    except DatError as e:
        if e.code == E.TOKEN_EXPIRED:
            # Normal end of life. Send the client back to log in again.
            return refresh_flow()
        if e.security_event:
            # Forged signature or tampered payload — exactly two codes set this.
            security_log(e.code)
            return block_session()
        # Malformed, unknown cid, ... — just reject the request.
        return reject(e.code)
```

`retry` tells you whether trying again can ever help. Do not loop on a permanent one —
a wrong CMS token stays wrong no matter how many times you retry.

```python
# TRANSIENT -> back off and retry | PERMANENT -> fix config | STATE -> not an error
if e.retry is DatRetry.TRANSIENT:
    backoff()
    return retry()
```

::: tip One exception type, catchable as both legacy types
`DatError` inherits from **both** `ValueError` and `RuntimeError`. The same condition used
to raise different types depending on which call path you took, so existing
`except ValueError` / `except RuntimeError` blocks keep working — but new code should
catch `DatError` and branch on `code`.
:::

<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import RegistryBadge from '../../.vitepress/ui/RegistryBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Pypi', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
