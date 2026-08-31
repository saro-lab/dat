# Cheti

Cheti cha DAT huwakilisha katika mfuatano mmoja vipindi vya muda, algoriti na funguo zinazohitajika kutoa na kuthibitisha tokeni.

<WireFormat
  hint="Cheti pia kina sehemu za ASCII za mpangilio usiobadilika zilizotenganishwa kwa nukta."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Kitambulisho kisichobadilika cha cheti'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Wakati wa kuanza kutoa'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Kipindi cha utoaji'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Muda wa uhalali wa DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Algoriti ya sahihi'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Algoriti ya usimbaji fiche'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Ufunguo wa kusaini au kuthibitisha'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Ufunguo wa usimbaji fiche'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Kipindi cha muda

<CertTimeline />

- Cheti kinaweza kutoa DAT kuanzia `start` hadi `start + duration`, pamoja na nyakati zote mbili za mwisho.
- DAT iliyotolewa ni halali kwa `ttl` kuanzia wakati ilipotolewa.
- Cheti kinahitajika kwa uthibitishaji hadi `start + duration + ttl`. Kinaweza kuthibitisha hata katika wakati huo hasa.

Cheti kikifutwa mara tu kipindi cha utoaji kinapoisha, DAT zilizotolewa tayari haziwezi kuthibitishwa. Kidhibiti na CMS hushughulikia uwezo wa kutoa na uwezo wa kuthibitisha kando.

## Kitambulisho cha cheti na kubadilisha funguo

`cid` ni mkataba wazi unaotambulisha funguo na kipindi cha muda. Usiandike ufunguo mwingine juu ya `cid` iliyopo. Unapobadilisha ufunguo, unda cheti kipya na utumie `cid` mpya. Huduma husawazisha cheti kipya mapema, na kuondoa cha zamani baada ya DAT zote kilizotoa kuisha.

## Algoriti za sahihi

| Jina | Matumizi | Cheti cha uthibitishaji pekee |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Haitumiki |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Haitumiki |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Haitumiki |
| `ECDSA-P256` | ECDSA P-256 | Inatumika |
| `ECDSA-P384` | ECDSA P-384 | Inatumika |
| `ECDSA-P521` | ECDSA P-521 | Inatumika |

HMAC hutumia ufunguo uleule kusaini na kuthibitisha, kwa hiyo kuupa seva ya uthibitishaji ufunguo pia huipa uwezo wa kutoa tokeni. Katika mazingira yanayohitaji kutenganisha mamlaka ya utoaji, tumia ECDSA na vyeti vya uthibitishaji pekee.

## Algoriti za usimbaji fiche

| Jina | Ufunguo |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Majina ya algoriti ni sehemu ya mkataba wa waya. Usiyabadilishe kwa majina mbadala yanayotumiwa na JWT.

## Cheti kamili na cheti cha uthibitishaji pekee

Cheti kamili cha ECDSA kina ufunguo binafsi unaohitajika kusaini. Cheti cha uthibitishaji pekee hubakiza ufunguo wa umma wa ECDSA tu, lakini huhifadhi ufunguo wa AES unaohitajika kusimbua `secure`. Kwa hiyo huduma ya uthibitishaji pekee inaweza kukagua na kusimbua DAT, lakini haiwezi kutoa DAT mpya.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
