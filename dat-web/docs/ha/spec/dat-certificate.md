# Takardar shaida

Takardar shaidar DAT tana wakiltar zangon lokaci, algorithms da maɓallan da ake buƙata don bayarwa da tabbatar da token a kirtani guda.

<WireFormat
  hint="Takardar shaida ma tana da filayen ASCII masu tsayayyen tsari da aka raba da digo."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID na takardar shaida marar canzawa'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Lokacin fara bayarwa'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Tsawon lokacin bayarwa'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Lokacin ingancin DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Algorithm na sa hannu'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Algorithm na ɓoyewa'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Maɓallin sa hannu ko tabbatarwa'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Maɓallin ɓoyewa'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Zangon lokaci

<CertTimeline />

- Takardar shaida tana iya bayar da DAT daga `start` zuwa `start + duration`, har da iyakokin biyu.
- DAT da aka bayar yana da inganci na `ttl` daga lokacin bayarwa.
- Ana buƙatar takardar don tabbatarwa har `start + duration + ttl`. A daidai wannan lokacin ma tana iya tabbatarwa.

Idan an goge takardar da zarar lokacin bayarwa ya ƙare, ba za a iya tabbatar da DAT da aka riga aka bayar ba. Manaja da CMS suna kula da ikon bayarwa da ikon tabbatarwa dabam.

## ID na takardar shaida da sauya maɓalli

`cid` yarjejeniya ce ta fili da ke gano maɓallai da zangon lokaci. Kada a rubuta sabon maɓalli a kan `cid` na da. Lokacin sauya maɓalli, ƙirƙiri sabuwar takarda kuma yi amfani da sabon `cid`. Ayyuka suna daidaita sabuwar takarda tun da wuri, sannan su cire tsohuwa bayan duk DAT da ta bayar sun ƙare.

## Algorithms na sa hannu

| Suna | Amfani | Takardar tabbatarwa kaɗai |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Ba a goyon baya |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Ba a goyon baya |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Ba a goyon baya |
| `ECDSA-P256` | ECDSA P-256 | Ana goyon baya |
| `ECDSA-P384` | ECDSA P-384 | Ana goyon baya |
| `ECDSA-P521` | ECDSA P-521 | Ana goyon baya |

HMAC yana amfani da maɓalli iri ɗaya don sa hannu da tabbatarwa, don haka bai wa sabar tabbatarwa maɓallin yana ba ta ikon bayarwa ma. A wuraren da dole a raba ikon bayarwa, yi amfani da ECDSA da takardun tabbatarwa kaɗai.

## Algorithms na ɓoyewa

| Suna | Maɓalli |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Sunayen algorithm suna cikin yarjejeniyar waya. Kada a maye gurbinsu da sunayen laƙabi na JWT.

## Cikakkiyar takarda da takardar tabbatarwa kaɗai

Cikakkiyar takardar ECDSA tana da private key da ake buƙata don sa hannu. Takardar tabbatarwa kaɗai tana barin public key na ECDSA, amma tana riƙe maɓallin AES da ake buƙata don decrypt `secure`. Don haka aikin tabbatarwa kaɗai na iya duba da decrypt DAT amma ba zai iya bayar da sabon DAT ba.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
