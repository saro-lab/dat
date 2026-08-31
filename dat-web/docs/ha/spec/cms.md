# DAT CMS

DAT CMS aiki ne na zaɓi da ke ƙirƙira, adanawa da isar da takardun shaida ga manajojin abokan ciniki. Wannan takarda tana bayyana yarjejeniyar daidaitawa tsakanin abokin ciniki da saba. Don shigarwa da gudanarwa, duba [jagorar aikin DAT CMS](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Daidaita takardun shaida"
  :actors="[
    {id: 'client', label: 'Abokin ciniki', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Neman sigar yanzu da takardun shaida', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Amsa da siga da takardun shaida', kind: 'res'},
    {from: 'client', label: 'Tabbatar da duka sannan amfani da su atomically', kind: 'note'},
  ]"
/>

## Endpoints bisa matsayi

| Matsayi | Hanya | Amfani |
| --- | --- | --- |
| Samun cikakkun takardun shaida | `GET /v1/certs?version=<n>` | Ayyukan da ke bayar da DAT |
| Samun takardun tabbatarwa kaɗai | `GET /v1/certs/verify-only?version=<n>` | Ayyukan tabbatarwa da decrypt kaɗai |
| Rijistar takardar shaida | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Mai gudanarwa ko aikin ƙirƙirar takarda |

Ana iya kare neman cikakkun takardu da na tabbatarwa kaɗai da matsayin token daban. Saita zaɓin `verifyOnly` na manajan abokin ciniki don kada aikin tabbatarwa kaɗai ya nemi cikakkun takardu.

## Alamar siga

Abokin ciniki yana aika sigar ƙarshe da ya yi amfani da ita ga sabar. Idan yanayin sabar bai canza ba, ba sai ta sake aika takardu ba. Idan akwai sabon yanayi, layi na farko yana dawo da siga, layuka na gaba kuma takardun shaida.

Idan amsa mai nasara tana da siga kawai ba tare da takardu ba, ana riƙe takardun yanzu da mai bayarwa. Amsa da sigar sabar da ta yi ƙasa da ta abokin ciniki ba ta mayar da yanayi baya; ana sarrafa ta a matsayin kuskure.

## Dokokin amfani da takardun shaida

- Idan `cid` iri ɗaya ya maimaitu cikin amsa, ana ƙin dukan amsar.
- Idan `cid` da ake da shi ya yi daidai da na sabuwar amsa, ana riƙe takardar yanzu.
- Ana amfani da yanayi lokaci guda bayan parse da tabbatar da duk takardun.
- Ba a bar yanayin da wasu takardu kaɗai suka yi nasara ba.
- Ana zaɓar takardar da ta dace a matsayin mai bayarwa daga waɗanda za su iya bayarwa a lokacin yanzu.

## Daidaitawar farko da ta hannu

Daidaitawar farko yayin ƙirƙirar manajan abokin ciniki yawanci best-effort ce. Ko ta gaza, ana ƙirƙirar manajan kuma a adana takamaiman kuskuren ƙarshe. Idan dole ne manhajar ta gaza farawa, kira immediate synchronization API na dakin karatu don miƙa kuskuren ga mai kira.

Wuraren da ba sa amfani da daidaitawa ta atomatik za su iya kashe interval su daidaita da hannu lokacin da ake buƙata. Idan ana amfani da ta atomatik, rufe ko tsayar da manajan lokacin kashe manhaja.

## Cibiyar sadarwa da kurakurai

Saita connection da total request timeout bisa yanayin production. Redirect policy ya bambanta da runtime, don haka duba takardar dakin karatu. Amsoshin CMS marasa 2xx ana rarraba su a abokan ciniki na yanzu a matsayin kuskuren `DAT_CMS_*` da ya dace da matsayin HTTP; ba a adana cikakken lambar kuskuren JSON na sabar yadda yake ba.

Idan ma'ajiya ta sami matsala ta wucin gadi, sabar na iya ba da snapshot na takardun shaida na ƙarshe da ya yi nasara. Idan babu snapshot da ya taɓa yin nasara, tana amsawa da `DAT_STORE_UNAVAILABLE`.

## Takardar aiki

Deployment, database, access tokens da tsarin gudanarwa suna cikin [jagorar aikin DAT CMS](../svc/docker-saro-lab-dat-cms).

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
