# DAT Ruby Library
<GithubBadge label="GitHub" /> <RegistryBadge /> · [Test Code](https://github.com/saro-lab/dat/tree/master/dat-ruby/test)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>

> **Requires:** Ruby >= 2.7 · `require 'saro-dat'` · depends on the `openssl` gem


## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: test_cms_manager.rb](https://github.com/saro-lab/dat/blob/master/dat-ruby/test/test_cms_manager.rb)
```rb
manager = Saro::Dat::DatCmsManager.builder
  .uri("http://localhost:8088")
  .verify_only(false)
  #.interval_off # disable auto sync
  .interval_seconds(60)
  .token("12345678901b")
  .build

# manual sync
# manager.sync

plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिको드 Ю니код 🦄💻"
secure = "Ciphertext 암호문 暗号文 密文 Шифро텍스트 Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

puts "plain : " + plain
puts "secure : " + secure

# issue dat
dat = manager.issue(plain, secure)
puts "dat : " + dat

# parse dat
payload = manager.parse(dat)

payload_plain = payload.plain
payload_secure = payload.secure

puts "payload plain : " + payload_plain
puts "payload secure : " + payload_secure

assert_equal plain, payload_plain
assert_equal secure, payload_secure
```

#### {{t('manual_code')}}
- [{{t('example')}}: test_hard.rb](https://github.com/saro-lab/dat/blob/master/dat-ruby/test/test_hard.rb)
- [{{t('example')}}: test_manager_example.rb](https://github.com/saro-lab/dat/blob/master/dat-ruby/test/test_manager_example.rb)
```rb
require 'saro-dat'

manager = Saro::Dat::DatManager.new

# (cid, issuance_start, issuance_duration, dat_ttl, signature, crypto)
cert = [Saro::Dat::DatCertificate.new(
  1,
  Time.now.to_i - 10,
  3600,
  1800,
  Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::HMAC_SHA512_MFS),
  Saro::Dat::DatCrypto.generate(Saro::Dat::DatCryptoAlgorithm::IV_AES128_GCM)
)]
manager.import_certificates(cert)

plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

dat = manager.issue(plain, secure)
puts "DAT : #{dat}"

payload = manager.parse(dat)

assert_equal plain, payload.plain
assert_equal secure, payload.secure

puts "plain : #{payload.plain}"
puts "secure: #{payload.secure}"
```

#### {{t('crypto')}} / {{t('sig')}}
```rb
# Base64 input and raw binary input are separate methods — the encoding is never
# guessed from the string's encoding tag.
crypto = Saro::Dat::DatCrypto.generate(Saro::Dat::DatCryptoAlgorithm::IV_AES256_GCM)

encrypted = crypto.encrypt("secret")   # raw bytes (BINARY)
crypto.decrypt(encrypted)              # raw bytes in
crypto.decrypt_base64(base64_str)      # Base64Url text in

signature = Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::ECDSA_P256)
signature.verify(data, raw_sig_bytes)
signature.verify_base64(data, base64_sig)
```

#### {{t('error_handling')}}
- [{{t('example')}}: test_error_code.rb](https://github.com/saro-lab/dat/blob/master/dat-ruby/test/test_error_code.rb)

Every failure raises `Saro::Dat::Error`, which carries a `code` that is identical
across all official clients. Rescue that class rather than `StandardError` — the
code is what tells you which of these three situations you are in.

```rb
EC = Saro::Dat::ErrorCode

begin
  payload = manager.parse(dat)
rescue Saro::Dat::Error => e
  case e.code
  when EC::TOKEN_EXPIRED
    # Normal end of life. Ask the client to get a fresh token.
    redirect_to_login
  when EC::SIG_MISMATCH
    # Forgery: the signature does not belong to this certificate.
    # e.security_event? is true here.
    security_log.warn("forged dat", code: e.code)
    terminate_session
  else
    # Anything else is a bad request. Reject it.
    render_400(e.code)
  end
end
```

`#retry` collapses every code into one of three decisions, so callers never have
to keep their own list. Only `:transient` is worth retrying.

```rb
begin
  dat = manager.issue(plain, secure)
rescue Saro::Dat::Error => e
  case e.retry
  when :transient then schedule_retry_with_backoff  # e.g. sync has not finished yet
  when :permanent then alert_operations(e.code)     # config or deployment is wrong
  when :state     then nil                          # not an error, just a signal
  end
end
```

A failed sync never raises — the manager is still returned so it can recover on a
later cycle. Poll `#last_error` instead: anything other than `nil` means
certificates are no longer being refreshed.

```rb
if (err = manager.last_error)
  # DAT_CMS_NOT_SYNCED until the first sync succeeds.
  # :permanent means retrying will not help — a token or URL is wrong.
  alert_operations(err.code) if err.retry == :permanent
end
```


<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import GithubBadge from '../../.vitepress/ui/GithubBadge.vue';
import RegistryBadge from '../../.vitepress/ui/RegistryBadge.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Gems', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
