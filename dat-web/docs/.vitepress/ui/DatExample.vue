<template>
  <div>

    <div class="g-glass rd-box box my-3 md">
      <div class="g-panel-head">
        <span class="g-panel-icon"><span translate="no" class="material-symbols-outlined">key</span></span>
        <h2 class="g-panel-title">{{t('gen_certs')}}</h2>
      </div>

      <div class="g-label">{{t('sig_alg')}}</div>
      <div class="g-radio-group">
        <div v-for="sa in signAlgList">
          <input type="radio" :id="`gen-sa-${sa}`" name="gen-sa" :value="sa" v-model="genCertSignAlg">
          <label :for="`gen-sa-${sa}`">{{sa}}</label>
        </div>
      </div>
      <div v-if="genCertSignAlg.startsWith('ECDSA-')" class="g-radio-group">
        <div>
          <input type="radio" :id="`gen-sa-vo-0`" name="gen-sa-vo" :value="false" v-model="genCertExportVerifyOnly">
          <label :for="`gen-sa-vo-0`">{{t('export_key_pair')}}</label>
        </div>
        <div>
          <input type="radio" :id="`gen-sa-vo-1`" name="gen-sa-vo" :value="true" v-model="genCertExportVerifyOnly">
          <label :for="`gen-sa-vo-1`">{{t('export_verify_only')}}</label>
        </div>
      </div>

      <div class="g-label">{{t('crypto_alg')}}</div>
      <div class="g-radio-group">
        <div v-for="ca in cryptoAlgList">
          <input type="radio" :id="`gen-ca-${ca}`" name="gen-ca" :value="ca" v-model="genCertCryptoAlg">
          <label :for="`gen-ca-${ca}`">{{ca}}</label>
        </div>
      </div>

      <div class="field-grid">
        <div>
          <div class="g-label-row">
            <span class="g-label">{{t('dat_issue_start')}}</span>
            <span class="g-label-note">unixtime</span>
          </div>
          <input class="w-full" type="text" inputmode="numeric" v-model="genCertIssueBegin" />
        </div>
        <div>
          <div class="g-label-row">
            <span class="g-label">{{t('dat_issue_dur')}}</span>
            <span class="g-label-note">{{t('seconds')}}</span>
          </div>
          <input class="w-full" type="text" inputmode="numeric" v-model="genCertIssueDuration" />
        </div>
        <div>
          <div class="g-label-row">
            <span class="g-label">{{t('dat_ttl')}}</span>
            <span class="g-label-note">{{t('seconds')}}</span>
          </div>
          <input class="w-full" type="text" inputmode="numeric" v-model="genCertDatTtl" />
        </div>
      </div>

      <div class="readout mt-3.5" :class="({bad: !genCertTimeValid})">
        <span translate="no" class="material-symbols-outlined">schedule</span>
        <span class="readout-body">{{genCertTimeDisplay}}</span>
      </div>

      <div class="action-row">
        <div class="count-field">
          <span class="g-label">{{t('gen_count')}}</span>
          <input class="w-full" type="text" inputmode="numeric" v-model="genCertCount" />
        </div>
        <button class="btn primary click-here-bg" @click="doGenerate">{{t('gen')}}</button>
      </div>

      <LogBox v-model="genCertLogList"/>
    </div>

    <div class="g-glass rd-box box my-3 md">
      <div class="g-panel-head">
        <span class="g-panel-icon"><span translate="no" class="material-symbols-outlined">move_to_inbox</span></span>
        <h2 class="g-panel-title">{{t('import_certs')}}</h2>
        <span v-if="importCertCount" class="g-panel-aside">{{importCertCount}}</span>
      </div>

      <div class="mt-4 language-text">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, importCertList)"></button>
        <textarea class="w-full h-48 text-xs!" spellcheck="false" :placeholder="t('paste_cert')" v-model="importCertList"></textarea>
      </div>
      <div class="action-row">
        <button class="btn" @click="doImportCertificate">{{t('import_certs')}}</button>
      </div>

      <LogBox v-model="importCertLogList"/>
    </div>

    <div v-if="mgrCertList.length">

      <div class="g-glass rd-box box my-3 md">
        <div class="g-panel-head">
          <span class="g-panel-icon"><span translate="no" class="material-symbols-outlined">badge</span></span>
          <h2 class="g-panel-title">{{t('mgr_certs')}}</h2>
          <span class="g-panel-aside">{{mgrCertList.length}}</span>
        </div>

        <div class="cert-grid">
          <div v-for="card in mgrCertCards" :key="card.cid" class="cert-card"
               :class="({sel: card.cid === mgrCertSelectCid, off: !card.ready})"
               @click="mgrCertSelectCid = card.cid">
            <div class="cc-head">
              <span class="cc-dot"></span>
              <span class="cc-cid">{{card.cid}}</span>
              <span class="cc-ttl">{{card.ttl}}</span>
            </div>
            <div class="cc-tags">
              <span class="cc-tag">{{card.sig}}</span>
              <span class="cc-tag">{{card.crypto}}</span>
            </div>
            <div class="cc-rows">
              <div>
                <span>{{t('dat_issue_dur')}}</span>
                <b>{{card.from}}</b>
                <b class="cc-to">{{card.to}}</b>
              </div>
              <div>
                <span>{{t('cert_exp')}}</span>
                <b>{{card.expire}}</b>
              </div>
            </div>
            <div v-if="card.flags.length" class="cc-flags">
              <span v-for="f in card.flags" class="cc-flag">{{f}}</span>
            </div>
          </div>
        </div>

        <div class="field-grid two">
          <div>
            <span class="g-label">{{t('dat_plain')}}</span>
            <input type="text" class="text-xs! w-full" spellcheck="false" v-model="mgrCertDatPlainText" @input="doInputIssueDat"/>
          </div>
          <div>
            <span class="g-label">{{t('dat_secure')}}</span>
            <input type="text" class="text-xs! w-full" spellcheck="false" v-model="mgrCertDatSecureText" @input="doInputIssueDat"/>
          </div>
        </div>
        <div class="action-row">
          <button class="btn primary" @click="doIssueDat">{{t('issue_dat')}}</button>
        </div>

        <LogBox v-model="mgrCertLogList"/>
      </div>

      <div class="g-glass rd-box box my-3 md">
        <div class="g-panel-head">
          <span class="g-panel-icon"><span translate="no" class="material-symbols-outlined">frame_inspect</span></span>
          <h2 class="g-panel-title">{{t('parse_dat')}}</h2>
        </div>

        <div class="mt-4 language-text">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDat)"></button>
          <input type="text" class="w-full text-xs!" spellcheck="false" :placeholder="t('paste_dat')" v-model="parseDat" />
        </div>
        <div class="action-row">
          <button class="btn primary" @click="doParseDat">{{t('parse_dat')}}</button>
          <div class="flex-1"></div>
          <button class="btn" @click="clearParseDat(true)">{{t('clear')}}</button>
        </div>

        <LogBox v-model="parseDatLogList"/>

        <div v-if="parseDatInfo" class="mt-4 language-text">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatInfo)"></button>
          <pre>{{parseDatInfo}}</pre>
        </div>

        <div class="field-grid two">
          <div>
            <span class="g-label">{{t('plain_text')}}</span>
            <div class="language-text">
              <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatPlainText)"></button>
              <input type="text" readonly class="text-xs! w-full" spellcheck="false" v-model="parseDatPlainText" />
            </div>
          </div>
          <div>
            <span class="g-label">{{t('secure_text')}}</span>
            <div class="language-text">
              <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatSecureText)"></button>
              <input type="text" readonly class="text-xs! w-full" spellcheck="false" v-model="parseDatSecureText" />
            </div>
          </div>
          <div>
            <span class="g-label">{{t('plain_hex')}}</span>
            <div class="language-text">
              <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatPlainHex.replace(/\s+/g, ''))"></button>
              <input type="text" readonly class="text-xs! w-full" spellcheck="false" v-model="parseDatPlainHex" />
            </div>
          </div>
          <div>
            <span class="g-label">{{t('secure_hex')}}</span>
            <div class="language-text">
              <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, parseDatSecureHex.replace(/\s+/g, ''))"></button>
              <input type="text" readonly class="text-xs! w-full" spellcheck="false" v-model="parseDatSecureHex" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="g-glass rd-box box my-3 md">
      <div class="g-panel-head">
        <span class="g-panel-icon"><span translate="no" class="material-symbols-outlined">swap_horiz</span></span>
        <h2 class="g-panel-title">{{t('tool_bytes_title')}}</h2>
      </div>
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


const genCertTimeValid = computed(() => checkNumberInput(false, false));

const genCertTimeDisplay = computed(() => {
  if (!genCertTimeValid.value) {
    return t('err_invalid_issue_times');
  }
  let begin = BigInt(genCertIssueBegin.value);
  let duration = BigInt(genCertIssueDuration.value);
  let bt = Unixtime.fromSeconds(begin).format(`yyyy-MM-dd HH:mm:ss`);
  let et = Unixtime.fromSeconds(begin + duration).format(`yyyy-MM-dd HH:mm:ss XXX`).replace(bt.substring(0, 11), '');
  return `${bt} ~ ${et}`;
});

const DATE_FMT = `yyyy-MM-dd HH:mm:ss`;

function certFlags(cert: DatCertificate): string[] {
  const flags: string[] = [];
  if (cert.expired()) {
    flags.push(t('expired'));
  }
  if (!cert.signable()) {
    flags.push(t('verify_only'));
  } else if (!cert.expired() && !cert.issuable()) {
    flags.push(t(cert.datIssuanceEndSeconds < Unixtime.now().time ? `issue_over` : `not_issue_yet`));
  }
  return flags;
}

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
const importCertCount = computed(() => importCertList.value.trim().split(/[\r\n]+/).filter(e => e).length);
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

const mgrCertCards = computed(() => mgrCertList.value.map(cert => {
  const from = Unixtime.fromSeconds(cert.datIssuanceStartSeconds).format(DATE_FMT);
  const to = Unixtime.fromSeconds(cert.datIssuanceEndSeconds).format(DATE_FMT);
  return {
    cid: cert.cid.toString(16),
    ttl: `${cert.datTtlSeconds}${t('seconds')}`,
    sig: cert.signature.algorithm,
    crypto: cert.crypto.algorithm,
    from,
    to: to.startsWith(from.substring(0, 11)) ? to.substring(11) : to,
    expire: Unixtime.fromSeconds(cert.datIssuanceEndSeconds + cert.datTtlSeconds).format(`${DATE_FMT} XXX`),
    ready: cert.signable() && cert.issuable() && !cert.expired(),
    flags: certFlags(cert as DatCertificate),
  };
}));
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

.click-here-bg {
  animation: blink-accent 0.9s ease-in-out 2;
}
@keyframes blink-accent {
  50% { border-color: var(--c-link-1); background-color: color-mix(in srgb, var(--c-link-1) 22%, transparent); }
}

.field-grid {
  @apply grid grid-cols-1 gap-x-4 gap-y-0 mt-1;
  @variant min-sm {
    @apply grid-cols-3;
  }
  &.two {
    @variant min-sm {
      @apply grid-cols-2;
    }
  }
}

.readout {
  @apply flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-[0.78rem];
  background-color: var(--code-bg);
  border: 1px solid var(--code-border);
  color: var(--c-heading);
  text-shadow: none;

  .material-symbols-outlined {
    @apply text-base! shrink-0 opacity-55;
  }
  .readout-body {
    @apply min-w-0 overflow-x-auto whitespace-nowrap;
  }
  &.bad {
    color: #e0554a;
    border-color: color-mix(in srgb, #e0554a 35%, transparent);
  }
}

.action-row {
  @apply flex items-end gap-2 mt-4;

  .count-field {
    @apply max-w-32;

    .g-label {
      @apply mt-0;
    }
  }
}

.cert-grid {
  @apply grid grid-cols-1 gap-2 mt-4;
  @variant min-md {
    @apply grid-cols-2;
  }
  @variant min-[64rem] {
    @apply grid-cols-3;
  }
}

.cert-card {
  @apply rounded-lg px-3 py-2.5 cursor-pointer select-none transition-colors duration-150;
  background-color: color-mix(in srgb, currentColor 4%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 8%, transparent);

  &:hover {
    background-color: var(--ctrl-bg-hover);
    border-color: var(--ctrl-border-hover);
  }
  &.sel {
    background-color: var(--ctrl-bg-on);
    border-color: var(--ctrl-border-on);

    .cc-cid {
      color: var(--ctrl-fg-on);
    }
  }

  .cc-head {
    @apply flex items-center gap-2;
  }
  .cc-dot {
    @apply w-1.5 h-1.5 rounded-full shrink-0;
    background-color: var(--c-accent-1);
  }
  .cc-cid {
    @apply font-mono text-[0.9rem] tracking-tight;
    color: var(--c-heading);
    text-shadow: none;
  }
  .cc-ttl {
    @apply ml-auto font-mono text-[0.68rem];
    color: var(--c-muted);
  }

  .cc-tags {
    @apply flex flex-wrap gap-1 mt-2;
  }
  .cc-tag {
    @apply inline-block rounded px-1.5 py-0.5 font-mono text-[0.62rem] tracking-tight;
    color: color-mix(in srgb, var(--c-text-1) 72%, transparent);
    background-color: color-mix(in srgb, currentColor 8%, transparent);
  }

  .cc-rows {
    @apply mt-2.5 flex flex-col gap-1;

    > div {
      @apply flex flex-col;
    }
    span {
      @apply text-[0.62rem] uppercase tracking-[0.07em];
      color: color-mix(in srgb, var(--c-muted) 85%, transparent);
    }
    b {
      @apply font-mono font-normal text-[0.7rem] break-all;
      color: var(--c-text-2);
    }
    .cc-to::before {
      content: "– ";
      color: var(--c-muted);
    }
  }

  .cc-flags {
    @apply flex flex-wrap gap-1 mt-2.5;
  }
  .cc-flag {
    @apply inline-block rounded px-1.5 py-0.5 text-[0.62rem] font-medium;
    color: #e0554a;
    background-color: color-mix(in srgb, #e0554a 12%, transparent);
    border: 1px solid color-mix(in srgb, #e0554a 25%, transparent);
  }

  &.off {
    .cc-dot {
      background-color: color-mix(in srgb, var(--c-muted) 55%, transparent);
    }
    .cc-cid {
      color: var(--c-muted);
    }
  }
}

</style>
