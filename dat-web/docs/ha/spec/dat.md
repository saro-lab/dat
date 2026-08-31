# DAT

DAT kirtanin ASCII ne da aka raba da digo (`.`). Filaye suna bayyana sau ɗaya a tsayayyen tsari, kuma sa hannu yana tabbatar da cewa filayen baya sun kasance yadda aka aika su.

<WireFormat
  hint="Tsarin filaye da masu raba su suna cikin ƙa'ida."
  :segments="[
    {name: 'expire', type: 'uint64 (goma)', kind: 'meta', note: 'Unix time na karewa'},
    {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'ID na takardar shaida'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte na fili'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte da aka ɓoye'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Sa hannun filaye huɗu na baya'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Filaye

| Fili | Wakilci | Ma'ana |
| --- | --- | --- |
| `expire` | Lambar goma marar alama | Unix time da DAT zai kare |
| `cid` | Ƙaramin baƙaƙen hex na lamba marar alama | ID na takardar shaidar tabbatarwa |
| `plain` | Base64Url ba tare da padding ba | Byte da ba a ɓoye ba |
| `secure` | Base64Url ba tare da padding ba | Byte da algorithm na ɓoyewar takardar shaida ya kare |
| `signature` | Base64Url ba tare da padding ba | Sa hannun ainihin ASCII bytes na `expire.cid.plain.secure` |

Ba za a iya canza `plain` ba domin yana cikin yankin sa hannu, amma kowa na iya decode ɗinsa. Saka sirri, bayanan mutum da ƙimomin da ake amfani da su kai tsaye wajen hukuncin izini a `secure`. `secure` marar komai ma ingantacce ne.

## Daidaitaccen wakilci

- Dukan DAT dole ya zama ASCII.
- Ana rubuta lambobi ba tare da alama, sarari, prefix ko `0` na gaba da ba dole ba. Ƙimar `0` kaɗai ake rubuta `0`.
- Base64Url yana amfani da haruffan URL-safe kuma ba ya yarda da `=` padding ko sarari.
- Ana ƙin Base64Url marar daidaito da ke wakiltar byte iri ɗaya da kirtani daban.
- Idan adadin filaye ko tsarinsu ya bambanta, ba DAT ba ne.

Waɗannan dokoki suna hana aiwatarwa daban karɓar kirtani daban a matsayin DAT iri ɗaya.

## Bayarwa

1. Zaɓi takardar shaida da za ta iya bayarwa yanzu.
2. Ƙirƙiri `expire` ta ƙara TTL na takardar ga lokacin yanzu.
3. Encode `plain` da Base64Url.
4. Ƙoye `secure` da algorithm na takardar shaida.
5. Sa hannu kan ASCII bytes da suka haɗa filayen baya da digo.

Bayarwa tana yiwuwa ne kawai a zangon takardar `start <= now <= start + duration`.

## Tabbatarwa

1. Parse DAT bisa dokokin daidaitaccen wakilci.
2. Duba cewa `expire > now`. `expire == now` yana nufin ya ƙare.
3. Nemo takardar da ta dace da `cid` kuma tabbatar za ta iya tabbatarwa.
4. Tabbatar da sa hannun ainihin bytes na `expire.cid.plain.secure`.
5. Tabbatar da kuma decrypt `secure`, sannan mayar da shi tare da `plain`.

Parsing API da ba sa tabbatar da sa hannu na lura ko bincike ne kawai. Kada a yi amfani da sakamakonsu don tantancewa ko bayar da izini.

## Nauyin da ke wajen ƙa'ida

DAT ba ya ayyana ma'ajiyar masu amfani, hanyar login, tsarin izini, header na isar da token ko jerin soke token. Manhaja ce ke yanke shawarar wace buƙata za ta amince da verified payload.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
