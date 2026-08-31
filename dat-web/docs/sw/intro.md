# DAT ni nini?

DAT (Distributed Access Token) ni kiwango cha tokeni ya ufikiaji kinachotumiwa na huduma ya utoaji na huduma ya uthibitishaji kwa kushiriki vyeti sawa. Uthibitishaji hauhitaji ombi jingine kwa huduma ya utoaji au hifadhi kuu ya vipindi, hivyo matokeo ya uthibitishaji yanaweza kuwasilishwa huku utegemezi kati ya huduma ukipunguzwa.

<WireFormat
  hint="Sehemu zilizotenganishwa kwa nukta huunda DAT moja."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Unix time ya kuisha'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Kitambulisho cha cheti'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Data wazi'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Data iliyosimbwa kwa njia fiche'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Sahihi ya mwili'},
  ]"
/>

## Vipengele

### DAT

Ni mfuatano ambao mtumiaji au huduma hutuma pamoja na ombi. Una muda wa kuisha na kitambulisho cha cheti, na unaweza kubeba data wazi na iliyosimbwa kwa njia fiche kwa pamoja.

### Cheti

Huifadhi algoriti, funguo na kipindi cha muda kinachohitajika kuunda na kukagua DAT. `cid`, yaani kitambulisho cha cheti, haibadiliki; ufunguo unapobadilishwa hutumiwa `cid` mpya.

### Kidhibiti

Kidhibiti cha maktaba ya mteja huhifadhi vyeti, huunda DAT kwa cheti kinachoweza kutoa tokeni wakati huo, na kuthibitisha kwa cheti kinacholingana na `cid` ya DAT.

### DAT CMS

Ni seva ya hiari inayounda, kuhifadhi na kupeleka vyeti kwa huduma. Inaweza kutoa cheti kamili kwa huduma za utoaji na cheti cha uthibitishaji pekee kwa huduma zinazothibitisha tu.

## Utoaji na uthibitishaji

<ArchFlow
  :user="{label: 'Mtumiaji', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Usimamizi wa vyeti', 'Usawazishaji kwa toleo']}"
  :service="{servers: [
    {label: 'Huduma ya utoaji', kind: 'issuer', icon: 'login', request: 'Taarifa za uthibitishaji', response: 'DAT', sync: 'Cheti kamili'},
    {label: 'Huduma ya uthibitishaji', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Kipengele kilicholindwa', sync: 'Cheti cha uthibitishaji pekee'},
  ]}"
/>

Huduma ya utoaji huamua data za `plain` na `secure` kisha huunda DAT. Huduma ya uthibitishaji hukagua muda wa kuisha, sahihi na maandishi yaliyosimbwa, kisha hupeleka maeneo yote mawili ya data kwa programu. `plain` imesainiwa lakini haijasimbwa, kwa hiyo usiweke siri au taarifa binafsi humo.

## Kwa nini uthibitishaji unaendelea cheti kinapobadilika?

Cheti kipya kinapoweza kutoa tokeni, DAT zinazofuata hutumia `cid` mpya. Cheti cha zamani hubaki kwa uthibitishaji hadi TTL ya DAT zilizotolewa tayari iishe. Hivyo mabadiliko ya funguo na kipindi cha uthibitishaji wa tokeni zilizopo vinaweza kuendeshwa pamoja.

## Inafaa kwa mazingira gani?

- Mazingira ambako uthibitishaji na kazi halisi zinasimamiwa na huduma tofauti
- Mazingira ambako runtime nyingi hutoa au kuthibitisha tokeni ileile
- Mazingira yanayotaka kupeleka taarifa za ruhusa za muda mfupi bila kuuliza hifadhi kuu ya vipindi
- Mazingira yanayohitaji kutenganisha taarifa wazi za uelekezaji na data ya kulindwa ndani ya tokeni moja

DAT haifafanui sera yenyewe ya ruhusa. Ukweli kwamba DAT ni halali na uamuzi wa programu kuruhusu ombi hilo ni mambo tofauti.

## Hati zinazofuata

- [Kiwango cha DAT](./spec/dat): Sehemu za tokeni na kanuni za uthibitishaji
- [Cheti](./spec/dat-certificate): Funguo na vipindi vya muda
- [Kiwango cha DAT CMS](./spec/cms): Mkataba wa usawazishaji
- [Maktaba](./libs/): Kuitumia katika programu

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
