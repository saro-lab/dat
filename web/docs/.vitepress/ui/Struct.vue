<template>
  <div>
    <div class="text-sm font-bold my-2 mx-1">{{t('structure')}}</div>
    <div class="p-1.5 my-1 help-box">
      <div v-for="(attr, idx) in attrs" class="node" @mouseover="sel = idx" @mouseout="sel = -1" :class="{sel: idx == sel}">
        <span>{{attr}}</span>
      </div>
    </div>
    <div class="mt-3 mx-1 text-sm font-bold">
      {{t('example')}}
      <span translate="no" class="material-symbols-outlined g-link text-lg! align-middle! font-bold!" @click="renew">refresh</span>
    </div>
    <div class="py-1.5 px-2.5 my-1 break-all help-box">
      <div v-if="props.type === 'dat'" class="mt-1 mb-1 text-xs opacity-30">{{sa}} / {{ca}}</div>
      <div>
        <div v-for="(attr, idx) in values" class="node-val" @mouseover="sel = idx" @mouseout="sel = -1" :class="{sel: idx == sel}">
          <span>{{attr}}</span>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from "vue";
import {useTranslate} from "../src/langs";
import {
  DatCertificate,
  DatCrypto,
  DatCryptoAlgorithms,
  DatManager,
  DatSignature,
  DatSignatureAlgorithms
} from "saro-dat";
import {Unixtime} from "infinite-unixtime";
const {t} = useTranslate();

const props = defineProps<{
  type: string
}>();

const attrs = ref([] as string[]);
const values = ref([] as string[]);
const sa = ref('');
const ca = ref('');
const sel = ref(-1);

async function renew() {
  let signature_alg = DatSignatureAlgorithms[Math.floor(Math.random() * DatSignatureAlgorithms.length)];
  sa.value = signature_alg;
  let signature = await DatSignature.generate(signature_alg);
  let crypto_alg = DatCryptoAlgorithms[Math.floor(Math.random() * DatCryptoAlgorithms.length)];
  ca.value = crypto_alg;
  let crypto = await DatCrypto.generate(crypto_alg);
  let cert = new DatCertificate(0xffff + Math.floor(Math.random() * 0xfffff), Unixtime.now().time, 3600, 1800, signature, crypto);

  if (props.type === 'dat') {
    attrs.value = [
      t('dat_expire'),
      'CID',
      t('dat_plain'),
      t('dat_secure'),
      t('sig'),
    ]
    values.value = (await DatManager.issue(cert, 'plain', 'secure')).split('.');
  } else if (props.type === 'cert') {
    attrs.value = [
      'CID',
      t('dat_issue_start'),
      t('dat_issue_dur'),
      t('dat_ttl'),
      t('sig_alg'),
      t('crypto_alg'),
      t('sig_key'),
      t('crypto_key'),
    ];
    values.value = (await cert.exports()).split('.');
  }

  for (let i = 0 ; i < attrs.value.length ; i++) {
    setTimeout(() => sel.value = i, 30 * i);
  }
  setTimeout(() => sel.value = -1, 30 * attrs.value.length);
}

onMounted(renew);


</script>

<style scoped>
@reference 'tailwindcss';
@custom-variant light (&:where(html.light *));
@custom-variant dark (&:where(html.dark *));
@variant dark (&:where(.dark, .dark *));


.node {
  @apply inline-block;
  &:not(.sel) {
    @apply opacity-80;
  }
  &:not(:first-child):before {
    content: '.';
  }
  span {
    @apply px-2 py-1 m-1 rounded-md inline-block font-bold;
  }
  &:nth-child(odd) span {
    @apply bg-[#3355ff22];
  }
  &:nth-child(even) span {
    @apply bg-[#33ff5522];
  }
  &.sel span {
    @apply bg-[#ffff0077];
  }
}
.node-val {
  @apply inline text-sm;
  &:not(.sel) {
    @apply opacity-50;
  }
  &:not(:first-child):before {
    content: '.';
  }
}
.help-box {
  @apply bg-[#ffffff55] dark:bg-[#00000055] rounded-md;
}
</style>