<template>
  <div>

    <div class="g-glass rd-box box my-3 md">
      <h1>{{t('gen_certs')}}</h1>
      <div>
        <div class="font-bold mt-2 text-sm">{{t('sig_alg')}}</div>
        <div class="g-radio-group">
          <div v-for="sa in signAlgList">
            <input type="radio" :id="`gen-sa-${sa}`" name="gen-sa" :value="sa" v-model="genCertSignAlg">
            <label :for="`gen-sa-${sa}`">{{sa}}</label>
          </div>
        </div>
      </div>
      <div v-if="genCertSignAlg.startsWith('ECDSA-')">
        <div class="g-radio-group">
          <div>
            <input type="radio" :id="`gen-sa-vo-0`" name="gen-sa-vo" :value="false" v-model="genCertExportVerifyOnly">
            <label :for="`gen-sa-vo-0`">{{t('export_key_pair')}}</label>
          </div>
          <div>
            <input type="radio" :id="`gen-sa-vo-1`" name="gen-sa-vo" :value="true" v-model="genCertExportVerifyOnly">
            <label :for="`gen-sa-vo-1`">{{t('export_verify_only')}}</label>
          </div>
        </div>
      </div>
      <div>
        <div class="font-bold mt-2 text-sm">{{t('crypto_alg')}}</div>
        <div class="g-radio-group">
          <div v-for="ca in cryptoAlgList">
            <input type="radio" :id="`gen-ca-${ca}`" name="gen-ca" :value="ca" v-model="genCertCryptoAlg">
            <label :for="`gen-ca-${ca}`">{{ca}}</label>
          </div>
        </div>
      </div>
      <div>
        <div class="font-bold mt-2 text-sm">{{t('dat_issue_dur')}} ({{t('seconds')}})</div>
        <div class="">
          <input class="mt-2 mr-2" type="text" inputmode="numeric" :placeholder="t('dat_issue_start')" v-model="genCertIssueBegin" />
          <input class="mt-2 mr-2" type="text" inputmode="numeric" :placeholder="t('dat_issue_dur')" v-model="genCertIssueDuration" />
          <input class="mt-2 mr-2" type="text" inputmode="numeric" :placeholder="t('dat_ttl')" v-model="genCertDatTtl" />
        </div>
      </div>
      <div class="mt-3">
        <pre>{{genCertTimeDisplay}}</pre>
      </div>
      <div>
        <div class="">
          <input class="mt-2 mr-2" type="text" inputmode="numeric" :placeholder="t('gen_count')" v-model="genCertCount" />
          <button class="btn click-here-bg" @click="doGenerate">{{t('gen')}}</button>
        </div>
      </div>
      <div>
        <LogBox v-model="genCertLogList"/>
      </div>
    </div>

    <div class="g-glass rd-box box my-3 md">
      <h1>{{t('import_certs')}}</h1>
      <div class="mt-3 language-text">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, importCertList)"></button>
        <textarea class="w-full h-48 text-xs!" spellcheck="false" :placeholder="t('paste_cert')" v-model="importCertList"></textarea>
      </div>
      <div class="mt-2">
        <button class="btn" @click="doImportCertificate">{{t('import_certs')}}</button>
      </div>
      <div>
        <LogBox v-model="importCertLogList"/>
      </div>
    </div>

    <div v-if="mgrCertList.length">

      <div class="g-glass rd-box box my-3 md">
        <h1>{{t('mgr_certs')}}</h1>
        <div class="mt-3 cert-group grid grid-cols-1 @min-lg:grid-cols-2 @min-3xl:grid-cols-3 gap-4">
          <div v-for="cert in mgrCertList" class="g-code-box" :class="({'sel': cert.cid.toString(16) === mgrCertSelectCid})" @click="mgrCertSelectCid = cert.cid.toString(16)">
            <div><span>CID</span> {{cert.cid.toString(16)}}</div>
            <div class="mt-0.5"><span>{{t('sig')}}</span> {{cert.signature.algorithm}}</div>
            <div><span>{{t('crypto')}}</span> {{cert.crypto.algorithm}}</div>
            <div class="mt-0.5"><span>{{t('dat_ttl')}}</span> {{cert.datTtlSeconds}} <span>{{t('seconds')}}</span></div>
            <div class="mt-0.5"><span>{{t('dat_issue_dur')}}</span></div>
            <div class="ml-2">{{Unixtime.fromSeconds(cert.datIssuanceStartSeconds).format(`yyyy-MM-dd HH:mm:ss`)}} ~</div>
            <div class="ml-2">{{Unixtime.fromSeconds(cert.datIssuanceEndSeconds).format(`yyyy-MM-dd HH:mm:ss XXX`)}}</div>
            <div class="mt-0.5"><span>{{t('cert_exp')}}</span></div>
            <div class="ml-2">{{Unixtime.fromSeconds(cert.datIssuanceEndSeconds + cert.datTtlSeconds).format(`yyyy-MM-dd HH:mm:ss XXX`)}}</div>
            <div v-if="cert.expired()">
              <div class="warn">{{t('expired')}}</div>
            </div>
            <div v-if="!cert.signable()" class="warn">
              {{t('verify_only')}}
            </div>
            <div v-else-if="!cert.expired() && !cert.issuable()" class="warn">
              {{t(cert.datIssuanceEndSeconds < Unixtime.now().time ? `issue_over` : `not_issue_yet`)}}
            </div>
          </div>
        </div>
        <div class="mt-1 gap-2 @min-xl:flex">
          <input type="text" class="mt-3 text-xs! w-full flex-1" spellcheck="false" :placeholder="t('dat_plain')" v-model="mgrCertDatPlainText" @input="doInputIssueDat"/>
          <input type="text" class="mt-3 text-xs! w-full flex-1" spellcheck="false" :placeholder="t('dat_secure')" v-model="mgrCertDatSecureText" @input="doInputIssueDat"/>
        </div>
        <div class="mt-3">
          <button class="btn" @click="doIssueDat">{{t('issue_dat')}}</button>
        </div>
        <div>
          <LogBox v-model="mgrCertLogList"/>
        </div>
      </div>

      <div class="g-glass rd-box box my-3 md">
        <h1>{{t('parse_dat')}}</h1>
        <div class="mt-3 language-text">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDat)"></button>
          <input type="text" class="w-full text-xs!" spellcheck="false" :placeholder="t('paste_dat')" v-model="parseDat" />
        </div>
        <div class="mt-3 @min-xl:flex">
          <button class="btn" @click="doParseDat">{{t('parse_dat')}}</button>
          <div class=" @max-xl:hidden  @min-xl:flex-1"></div>
          <button class="btn" @click="clearParseDat(true)">{{t('clear')}}</button>
        </div>
        <div>
          <LogBox v-model="parseDatLogList"/>
        </div>
        <div v-if="parseDatInfo" class="mt-3 language-text">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatInfo)"></button>
          <pre>{{parseDatInfo}}</pre>
        </div>
        <div class="mt-1 gap-2 @min-xl:flex">
          <div class="w-full flex-1 mt-3 language-text">
            <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatPlainText)"></button>
            <input type="text" readonly class="text-xs! w-full" spellcheck="false" :placeholder="t('plain_text')" v-model="parseDatPlainText" />
          </div>
          <div class="w-full flex-1 mt-3 language-text">
            <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatSecureText)"></button>
            <input type="text" readonly class="text-xs! w-full" spellcheck="false" :placeholder="t('secure_text')" v-model="parseDatSecureText" />
          </div>
        </div>
        <div class="mt-1 gap-2 @min-xl:flex">
          <div class="w-full flex-1 mt-3 language-text">
            <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatPlainHex.replace(/\s+/g, ''))"></button>
            <input type="text" readonly class="text-xs! w-full" spellcheck="false" :placeholder="t('plain_hex')" v-model="parseDatPlainHex" />
          </div>
          <div class="w-full flex-1 mt-3 language-text">
            <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatSecureHex.replace(/\s+/g, ''))"></button>
            <input type="text" readonly class="text-xs! w-full" spellcheck="false" :placeholder="t('secure_hex')" v-model="parseDatSecureHex" />
          </div>
        </div>
      </div>
    </div>
    <div class="g-glass rd-box box my-3 md">
      <h1>{{t('tool_bytes_title')}}</h1>
      <ToolBytes class="simple" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from "vue";
import {
  DatCertificate, DatInteger,
  DatCryptoAlgorithm, DatCryptoAlgorithms, DatSignatureAlgorithm, DatSignatureAlgorithms, DatSignature, DatCrypto,
  DatManager, Dat, DatArrayBuffer, DatBytes,

} from "saro-dat";
import {Unixtime} from "infinite-unixtime";
import {doCopyToClipboard} from "../src/comm";
import LogBox, {LogItem} from "./LogBox.vue";
import ToolBytes from "./ToolBytes.vue";
import {useData} from "vitepress";
const signAlgList = DatSignatureAlgorithms;
const cryptoAlgList = DatCryptoAlgorithms;

const genCertSignAlg = ref<DatSignatureAlgorithm>('HMAC-SHA512-MFS');
const genCertCryptoAlg = ref<DatCryptoAlgorithm>('IV-AES256-GCM');
const genCertExportVerifyOnly = ref(false);
const genCertIssueBegin = ref((Unixtime.now().time - 10n).toString());
const genCertIssueDuration = ref('3600');
const genCertDatTtl = ref('1800');
const genCertCount = ref('12');
const genCertLogList = ref<LogItem[]>([]);
const { lang } = useData();
import {useTranslate} from "../src/langs";
const {t} = useTranslate();


const genCertTimeDisplay = computed(() => {
  if (checkNumberInput(false, false)) {
    let begin = BigInt(genCertIssueBegin.value);
    let ttl = BigInt(genCertDatTtl.value);
    let duration = BigInt(genCertIssueDuration.value);
    let bt = Unixtime.fromSeconds(begin).format(`yyyy-MM-dd HH:mm:ss`);
    let et = Unixtime.fromSeconds(begin + duration).format(`yyyy-MM-dd HH:mm:ss XXX`).replace(bt.substring(0, 11), '');
    return (`${t('dat_issue_dur')}:
  ${bt} ~ ${et}
    `.trim());
  } else {
    return t('err_invalid_issue_times');
  }
});

function checkNumberInput(reset: boolean, withCount: boolean): boolean {
  try {
    DatInteger.toBigInt(genCertIssueBegin.value, t('err_issue_begin_range'), 0n, 253405000799999n);
  } catch (e) {
    if (reset) {
      genCertIssueBegin.value = Unixtime.now().time.toString();
      genCertLogList.value.push(LogItem.warn(`${e} -> Reset`));
    }
    return false;
  }
  try {
    DatInteger.toBigInt(genCertIssueDuration.value, t('err_issue_dur_range'), 1n);
  } catch (e) {
    if (reset) {
      genCertIssueDuration.value = '3600';
      genCertLogList.value.push(LogItem.warn(`${e} -> Reset`));
    }
    return false;
  }
  try {
    DatInteger.toBigInt(genCertDatTtl.value, t('err_dat_ttl_range'), 1n);
  } catch (e) {
    if (reset) {
      genCertDatTtl.value = '1800';
      genCertLogList.value.push(LogItem.warn(`${e} -> Reset`));
    }
    return false;
  }
  if (withCount) {
    try {
      DatInteger.toBigInt(genCertCount.value, t('err_gen_count_range'), 1n, 100n);
    } catch (e) {
      if (reset) {
        genCertCount.value = '12';
        genCertLogList.value.push(LogItem.warn(`${e} -> Reset`));
      }
      return false;
    }
  }
  return true;
}

async function doGenerate() {
  let certs = [];
  genCertLogList.value = [];
  try {
    checkNumberInput(true, true);
    let begin = BigInt(genCertIssueBegin.value);
    let ttl = BigInt(genCertDatTtl.value);
    let duration = BigInt(genCertIssueDuration.value);
    let count = BigInt(genCertCount.value);

    let cidList = makeRandomCid(Number(count));

    for (let i = 0; i < count; i++) {

      let signature = await DatSignature.generate(genCertSignAlg.value);
      let crypto = await DatCrypto.generate(genCertCryptoAlg.value);
      let cert = new DatCertificate(cidList[i], begin, duration, ttl, signature, crypto);

      certs.push(await cert.exports(genCertExportVerifyOnly.value));
    }

    importCertList.value = certs.join('\n');
    await doImportCertificate();
  } catch (e: any) {
    genCertLogList.value.push(LogItem.error(e.message || t('err_unknown')));
  }
}

function makeRandomCid(count: number) {
  let list = new Array(count);
  for (let i = 0; i < count; i++) {
    let cid = Math.floor(0xffffff * Math.random());
    if (list.find(e => e === cid)) {
      i--;
      continue;
    }
    list[i] = cid;
  }
  return list;
}

const importCertList = ref('');
const importCertLogList = ref<LogItem[]>([]);
async function doImportCertificate() {
  let certs = importCertList.value.trim();
  importCertLogList.value = [];
  if (!certs) {
    importCertLogList.value.push(LogItem.error(t('err_cert_empty')));
    return;
  }
  mgrCertSelectCid.value = '-1';
  mgrCertList.value = [];
  for (const format of certs.split(/[\r\n]+/)) {
    try {
      let cert = await DatCertificate.imports(format);
      if (mgrCertList.value.find(e => e.cid === cert.cid)) {
        throw new Error(`${t('ignored')}: ${t('err_cert_exists')} [cid:${cert.cid.toString(16)}]`);
      }
      mgrCertList.value.push(cert);
      mgrCertSelectCid.value = cert.cid.toString(16);
    } catch (e: any) {
      importCertLogList.value.push(LogItem.error(e.message || t('err_unknown')));
    }
  }
}

const mgrCertLogList = ref<LogItem[]>([]);
const mgrCertList = ref<DatCertificate[]>([]);
const mgrCertSelectCid = ref('-1');
const mgrCertDatPlainText = ref('');
const mgrCertDatSecureText = ref('');
function doInputIssueDat() {
  clearParseDat(true);
}
async function doIssueDat() {
  mgrCertLogList.value = [];
  if (mgrCertList.value.length == 0 || mgrCertSelectCid.value === '-1') {
    mgrCertLogList.value.push(LogItem.error(t('err_select_cert')));
    return;
  }
  const cert = mgrCertList.value.find(e => e.cid.toString(16) === mgrCertSelectCid.value);
  if (!cert) {
    mgrCertLogList.value.push(LogItem.error(t('err_select_cert')));
    return;
  }
  if (!cert.issuable()) {
    mgrCertLogList.value.push(LogItem.error(`${t('err_cert_not_issuable')} [cid:${cert.cid.toString(16)}]`));
    return;
  }
  if (cert.expired()) {
    mgrCertLogList.value.push(LogItem.warn(`${t('err_cert_expired')} [cid:${cert.cid.toString(16)}]`));
  }
  const plainText = mgrCertDatPlainText.value;
  const secureText = mgrCertDatSecureText.value;
  if (!plainText) {
    mgrCertLogList.value.push(LogItem.info(t('msg_plain_empty')));
  }
  if (!secureText) {
    mgrCertLogList.value.push(LogItem.info(t('msg_secure_empty')));
  }
  parseDat.value = await DatManager.issue(cert as DatCertificate, plainText, secureText)
  await doParseDat();
}

const parseDat = ref('');
const parseDatLogList = ref<LogItem[]>([]);
const parseDatInfo = ref('');
const parseDatPlainText = ref('');
const parseDatPlainHex = ref('');
const parseDatSecureText = ref('');
const parseDatSecureHex = ref('');

function clearParseDat(withDat = false) {
  if (withDat) {
    parseDat.value = '';
  }
  parseDatInfo.value = '';
  parseDatLogList.value = [];
  parseDatPlainText.value = '';
  parseDatPlainHex.value = '';
  parseDatSecureText.value = '';
  parseDatSecureHex.value = '';
}

async function doParseDat() {
  clearParseDat();
  const dat = Dat.from(parseDat.value);
  try {
    if (dat.format) {
      parseDatInfo.value = `CID: ${dat.cid.toString(16)}\nEXP:\n  ${dat.expire}\n  ${Unixtime.fromSeconds(dat.expire).format(`yyyy-MM-dd (E)\n  a hh:mm:ss XXX`)}`;
    }
    const cert = mgrCertList.value.find(e => e.cid === dat.cid);
    if (!cert) {
      parseDatLogList.value.push(LogItem.error(`${t('err_cert_not_exist')} [cid:${dat.cid}]`));
      return;
    }
    const payload = await DatManager.parse(cert as DatCertificate, dat);
    parseDatPlainHex.value = DatArrayBuffer.toHex(payload.plainBytes, true).toUpperCase();
    parseDatSecureHex.value = DatArrayBuffer.toHex(payload.secureBytes, true).toUpperCase();
    parseDatPlainText.value = payload.plain;
    parseDatSecureText.value = payload.secure;
    if (!payload.plain) {
      parseDatLogList.value.push(LogItem.info(`${t('msg_parse_ok')} - ${t('msg_plain_empty')}`));
    }
    if (!payload.secure) {
      parseDatLogList.value.push(LogItem.info(`${t('msg_parse_ok')} - ${t('msg_secure_empty')}`));
    }
    parseDatInfo.value += `\nSA: ${cert.signature.algorithm}\nCA: ${cert.crypto.algorithm}`
  } catch (e: any) {
    parseDatLogList.value.push(LogItem.error(e.message || t('err_unknown')));
    try {
      if (dat.plainBytes.byteLength > 0) {
        parseDatPlainHex.value = DatArrayBuffer.toHex(dat.plainBytes);
        parseDatPlainText.value = DatBytes.toUtf8(dat.plainBytes);
      }
    } catch (e2: any) {}
  }
}
</script>


<style scoped>
@reference 'tailwindcss';
@custom-variant light (&:where(html.light *));
@custom-variant dark (&:where(html.dark *));
@variant dark (&:where(.dark, .dark *));
.click-here-bg {
  animation: blink-red 0.3s ease-in-out 2;
}
@keyframes blink-red {
  50% { background-color: #e74c3c; }
}
.cert-group {
  > div {
    @apply p-1 text-xs font-normal border-2 box-border border-transparent cursor-pointer;
    span {
      @apply opacity-40 font-bold;
    }
    .warn {
      @apply text-[#e74c3c] font-bold;
    }
  }
  .sel {
    @apply border-[#3377ff33] bg-[#3377ff11]
    dark:border-[#00ff7733] dark:bg-[#00ff7711];
  }
}

</style>
