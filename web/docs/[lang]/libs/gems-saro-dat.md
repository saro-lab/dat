# DAT Ruby Library
- [Github](https://github.com/saro-lab/dat-ruby) / [Test Code](https://github.com/saro-lab/dat-ruby/tree/master/test)

## {{t('repository')}}
<LibUnit :lib="lib" class="no-title"/>


## {{t('example')}}

#### {{t('dat_cms')}}
- [{{t('download')}}: Kubernetes, Docker, Binary](../svc/docker-saro-lab-dat-cms)
- [{{t('example')}}: test_cms_manager.rb](https://github.com/saro-lab/dat-ruby/blob/master/test/test_cms_manager.rb)
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
- [{{t('example')}}: test_hard.rb](https://github.com/saro-lab/dat-ruby/blob/master/test/test_hard.rb)
- [{{t('example')}}: test_manager_example.rb](https://github.com/saro-lab/dat-ruby/blob/master/test/test_manager_example.rb)
```rb
manager = Saro::Dat::DatManager.new

cert = [Saro::Dat::DatCertificate.new(
  1,
  Time.now.to_i - 10,
  110,
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


<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { findLibrary } from '../../.vitepress/src/libs';
const lib = findLibrary('Gems', 'saro-dat');
import {useTranslate} from "../../.vitepress/src/langs";
const {t} = useTranslate();
</script>
