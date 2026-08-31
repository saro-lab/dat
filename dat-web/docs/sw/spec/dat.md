# DAT

DAT ni mfuatano wa ASCII uliotenganishwa kwa nukta (`.`). Sehemu huonekana mara moja kwa mpangilio uliowekwa, na sahihi huthibitisha kwamba sehemu zilizotangulia zimebaki kama zilivyotumwa.

<WireFormat
  hint="Mpangilio wa sehemu na vitenganishi ni sehemu ya kiwango."
  :segments="[
    {name: 'expire', type: 'uint64 (desimali)', kind: 'meta', note: 'Unix time ya kuisha'},
    {name: 'cid', type: 'uint64 (heksadesimali)', kind: 'meta', note: 'Kitambulisho cha cheti'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Baiti wazi'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Baiti zilizosimbwa'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Sahihi ya sehemu nne zilizotangulia'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Sehemu

| Sehemu | Uwakilishi | Maana |
| --- | --- | --- |
| `expire` | Desimali ya namba kamili isiyo na alama | Unix time ambapo DAT inaisha |
| `cid` | Heksadesimali ya herufi ndogo ya namba kamili isiyo na alama | Kitambulisho cha cheti cha uthibitishaji |
| `plain` | Base64Url bila padding | Baiti zisizosimbwa |
| `secure` | Base64Url bila padding | Baiti zinazolindwa kwa algoriti ya usimbaji fiche ya cheti |
| `signature` | Base64Url bila padding | Sahihi ya baiti asili za ASCII za `expire.cid.plain.secure` |

`plain` haiwezi kubadilishwa kwa sababu iko ndani ya eneo la sahihi, lakini mtu yeyote anaweza kuidekodi. Weka siri, taarifa binafsi na thamani zinazotumika moja kwa moja katika maamuzi ya ruhusa ndani ya `secure`. `secure` tupu pia ni halali.

## Uwakilishi sanifu

- DAT yote lazima iwe ASCII.
- Namba huandikwa bila alama, nafasi, kiambishi awali au `0` zisizohitajika mwanzoni. Thamani `0` pekee huandikwa `0`.
- Base64Url hutumia alfabeti salama kwa URL na hairuhusu padding ya `=` wala nafasi.
- Base64Url isiyo sanifu inayowakilisha baiti zilezile kwa mifuatano tofauti hukataliwa.
- Ikiwa idadi au mpangilio wa sehemu ni tofauti, mfuatano huo si DAT.

Kanuni hizi huzuia utekelezaji tofauti kukubali mifuatano tofauti kama DAT ileile.

## Utoaji

1. Chagua cheti kinachoweza kutoa tokeni kwa sasa.
2. Tengeneza `expire` kwa kuongeza TTL ya cheti kwenye wakati wa sasa.
3. Kodisha `plain` kwa Base64Url.
4. Simba `secure` kwa algoriti ya usimbaji fiche ya cheti.
5. Saini baiti za ASCII zinazounganisha sehemu zilizotangulia kwa nukta.

Utoaji unawezekana tu ndani ya kipindi cha cheti `start <= now <= start + duration`.

## Uthibitishaji

1. Changanua DAT kwa kanuni za uwakilishi sanifu.
2. Hakikisha `expire > now`. `expire == now` inamaanisha imeisha.
3. Tafuta cheti cha `cid` na uhakikishe kinaweza kuthibitisha.
4. Thibitisha sahihi ya baiti asili za `expire.cid.plain.secure`.
5. Thibitisha na usimbue `secure`, kisha uirudishe pamoja na `plain`.

API za uchanganuzi zisizothibitisha sahihi ni za uchunguzi au utambuzi pekee. Usitumie matokeo yake kuthibitisha utambulisho au kutoa ruhusa.

## Majukumu yaliyo nje ya kiwango

DAT haibainishi hifadhi ya watumiaji, mbinu ya kuingia, modeli ya ruhusa, kichwa cha kusafirisha tokeni wala orodha ya kubatilisha. Programu ndiyo huamua payload iliyothibitishwa iruhusiwe kwa maombi gani.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
