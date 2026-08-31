# Menene DAT?

DAT (Distributed Access Token) ƙa'idar token shiga ce da aikin bayarwa da aikin tabbatarwa suke amfani da ita ta hanyar raba takardun shaida iri ɗaya. Ba a buƙatar sake neman bayani daga aikin bayarwa ko ma'ajiyar zaman tsakiya yayin tabbatarwa, don haka ana iya isar da sakamakon tantancewa tare da rage dogaro tsakanin ayyuka.

<WireFormat
  hint="Filayen da aka raba da digo suna samar da DAT guda ɗaya."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Unix time na karewa'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID na takardar shaida'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Bayanan fili'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Bayanan da aka ɓoye'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Sa hannun jiki'},
  ]"
/>

## Sassa

### DAT

Kirtani ne da mai amfani ko aiki ke aikawa tare da buƙata. Yana ɗauke da lokacin karewa da ID na takardar shaida, kuma yana iya ɗaukar bayanan fili da na ɓoye tare.

### Takardar shaida

Tana ɗauke da algorithms, maɓallai da zangon lokaci da ake buƙata don ƙirƙira da duba DAT. `cid`, wato ID na takardar shaida, ba ya canzawa; idan an sauya maɓalli ana amfani da sabon `cid`.

### Manaja

Manajan dakin karatu na abokin ciniki yana adana takardun shaida, yana ƙirƙirar DAT da takardar da za ta iya bayarwa a halin yanzu, kuma yana tabbatarwa da takardar da ta dace da `cid` na DAT.

### DAT CMS

Sabar zaɓi ce da ke ƙirƙira, adanawa da isar da takardun shaida ga ayyuka. Tana iya bai wa aikin bayarwa cikakkiyar takarda, sannan aikin da ke tabbatarwa kaɗai takardar tabbatarwa kaɗai.

## Bayarwa da tabbatarwa

<ArchFlow
  :user="{label: 'Mai amfani', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Gudanar da takardun shaida', 'Daidaitawa bisa sigar']}"
  :service="{servers: [
    {label: 'Aikin bayarwa', kind: 'issuer', icon: 'login', request: 'Bayanan tantancewa', response: 'DAT', sync: 'Cikakkiyar takardar shaida'},
    {label: 'Aikin tabbatarwa', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Aikin da aka kare', sync: 'Takardar tabbatarwa kaɗai'},
  ]}"
/>

Aikin bayarwa yana zaɓar bayanan `plain` da `secure` sannan ya ƙirƙiri DAT. Aikin tabbatarwa yana duba lokacin karewa, sa hannu da rubutun da aka ɓoye, sannan ya miƙa sassan bayanan biyu ga manhaja. An sa wa `plain` hannu amma ba a ɓoye shi ba, don haka kada a saka sirri ko bayanan mutum a ciki.

## Me ya sa ana iya tabbatarwa ko da takardar shaida ta canza?

Lokacin da sabuwar takarda ta zama mai iya bayarwa, DAT na gaba suna amfani da sabon `cid`. Tsohuwar takarda tana nan don tabbatarwa har TTL na DAT da aka riga aka bayar ya ƙare. Don haka ana iya tafiyar da sauyin maɓalli da lokacin tabbatar da tsofaffin token tare.

## Wane yanayi ya dace da shi?

- Yanayin da ayyuka daban suke kula da tantancewa da ainihin aiki
- Yanayin da runtime da yawa suke bayarwa ko tabbatar da token iri ɗaya
- Yanayin da ke son isar da bayanan izini na ɗan lokaci ba tare da tambayar ma'ajiyar zaman tsakiya ba
- Yanayin da ke buƙatar raba bayanan turawa na fili da bayanan da za a kare cikin token guda

DAT ba ya ayyana manufofin izini da kansu. Kasancewar DAT ingantacce da hukuncin manhaja na amincewa da buƙatar abubuwa ne daban.

## Takardu na gaba

- [Ƙa'idar DAT](./spec/dat): Filayen token da dokokin tabbatarwa
- [Takardar shaida](./spec/dat-certificate): Maɓallai da zangon lokaci
- [Ƙa'idar DAT CMS](./spec/cms): Yarjejeniyar daidaitawa
- [Dakunan karatu](./libs/): Amfani da shi a manhaja

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
