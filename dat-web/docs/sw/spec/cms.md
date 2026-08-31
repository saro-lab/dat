# DAT CMS

DAT CMS ni huduma ya hiari inayounda, kuhifadhi na kupeleka vyeti kwa vidhibiti vya wateja. Hati hii inaeleza mkataba wa usawazishaji kati ya mteja na seva. Kwa usakinishaji na uendeshaji, soma [mwongozo wa huduma ya DAT CMS](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Usawazishaji wa vyeti"
  :actors="[
    {id: 'client', label: 'Mteja', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Kuomba toleo la sasa na vyeti', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Kujibu kwa toleo na vyeti', kind: 'res'},
    {from: 'client', label: 'Kuthibitisha vyote kisha kutumia kiatomiki', kind: 'note'},
  ]"
/>

## Endpoint kwa kila jukumu

| Jukumu | Njia | Matumizi |
| --- | --- | --- |
| Kupata vyeti kamili | `GET /v1/certs?version=<n>` | Huduma zinazotoa DAT |
| Kupata vyeti vya uthibitishaji pekee | `GET /v1/certs/verify-only?version=<n>` | Huduma za kuthibitisha na kusimbua pekee |
| Kusajili cheti | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Mwendeshaji au kazi ya kuunda cheti |

Maombi ya vyeti kamili na ya uthibitishaji pekee yanaweza kulindwa kwa majukumu tofauti ya tokeni. Weka chaguo la `verifyOnly` la kidhibiti ili huduma ya uthibitishaji pekee isiombe vyeti kamili.

## Kishale cha toleo

Mteja hupeleka kwa seva toleo la mwisho alilotumia. Ikiwa hali ya seva ni ileile, haitaji kutuma vyeti tena. Ikiwa kuna hali mpya, mstari wa kwanza hurudisha toleo na mistari inayofuata hurudisha vyeti.

Jibu lenye mafanikio likiwa na toleo tu bila vyeti, vyeti vilivyopo na cheti cha utoaji huhifadhiwa. Jibu lenye toleo la seva lililo chini kuliko la mteja halirudishi hali nyuma; hushughulikiwa kama kosa.

## Kanuni za kutumia vyeti

- `cid` ileile ikirudiwa katika jibu, jibu lote hukataliwa.
- Ikiwa `cid` inayomilikiwa tayari ni sawa na ya jibu jipya, cheti kilichopo huhifadhiwa.
- Hali hutumiwa mara moja baada ya vyeti vyote kuchanganuliwa na kuthibitishwa.
- Hali ya baadhi tu ya vyeti kufaulu haiachwi.
- Cheti kinachofaa huchaguliwa kuwa mtoaji kati ya vyeti vinavyoweza kutoa kwa wakati wa sasa.

## Usawazishaji wa kwanza na wa mkono

Usawazishaji wa kwanza wakati wa kuunda kidhibiti cha mteja kwa kawaida ni best-effort. Hata ukishindwa, kidhibiti huundwa na kosa mahususi la mwisho huhifadhiwa. Ikiwa programu lazima ishindwe kuanza, ita API ya usawazishaji wa mara moja ya maktaba husika ili kupeleka kosa kwa mwitaji.

Mazingira yasiyotumia usawazishaji otomatiki yanaweza kuzima interval na kusawazisha moja kwa moja yanapohitaji. Ukitumia usawazishaji otomatiki, funga au simamisha kidhibiti programu inapozimwa.

## Mtandao na makosa

Weka muda wa kuisha wa muunganisho na ombi lote kulingana na mazingira ya uzalishaji. Sera za uelekezaji upya hutofautiana kwa runtime, kwa hiyo soma hati ya maktaba. Majibu ya CMS yasiyo 2xx huainishwa na wateja wa sasa kama makosa ya `DAT_CMS_*` yanayolingana na hali ya HTTP; msimbo wa kina wa kosa katika JSON ya seva hauhifadhiwi kama ulivyo.

Wakati hifadhi ina hitilafu ya muda, seva inaweza kutoa snapshot ya mwisho ya vyeti iliyofaulu. Ikiwa bado hakuna snapshot iliyofaulu, hujibu kwa `DAT_STORE_UNAVAILABLE`.

## Hati ya huduma

Usambazaji, hifadhidata, tokeni za ufikiaji na usanidi wa utekelezaji vinaendelea katika [mwongozo wa huduma ya DAT CMS](../svc/docker-saro-lab-dat-cms).

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
