<template>
  <div>
    <div class="flex items-end">
      <h5>{{t('text')}}</h5>
      <div class="flex-1 text-right text-sm">{{size}} {{t('bytes')}}</div>
    </div>
    <div class="mt-3 language-text">
      <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, text)"></button>
      <textarea ref="refText" class="w-full h-16 text-xs!" :class="({err: !!textErr || !!base64Err})" spellcheck="false" :placeholder="t('input_text')" v-model="text" @input="doInput('text', ($event as any).target.value)"></textarea>
    </div>
    <div v-if="textErr" class="err-msg">{{textErr}}</div>

    <div class="flex gap-4 items-end justify-center g-check-group">
      <h5 class="flex-1">Base64</h5>
      <label>
        <input name="isBase64Url" type="checkbox" @change="changeBase64Option" v-model="isBase64Url">
        URL
      </label>
      <label>
        <input name="isBase64Pad" type="checkbox" @change="changeBase64Option" v-model="isBase64Pad">
        PAD
      </label>
    </div>
    <div class="mt-3 language-text">
      <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, base64)"></button>
      <textarea ref="refBase64" class="w-full h-16 text-xs!" :class="({err: !!base64Err})" spellcheck="false" :placeholder="t('input_base64')" v-model="base64" @input="doInput('base64', ($event as any).target.value)"></textarea>
    </div>
    <div v-if="base64Err" class="err-msg">{{base64Err}}</div>

    <div>
      <h5>Hex</h5>
    </div>
    <div class="mt-3 language-text">
      <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, hex.replace(/\s+/g, ''))"></button>
      <textarea ref="refHex" class="w-full h-16 text-xs!" :class="({err: !!hexErr || !!base64Err})" spellcheck="false" :placeholder="t('input_hex')" v-model="hex" @keydown="evtHexCursor" @input="doInput('hex', ($event as any).target.value)"></textarea>
    </div>
    <div v-if="hexErr" class="err-msg">{{hexErr}}</div>

    <div class="view-simple hidden mt-2">
      <a :href="`${root}/tool/bytes`">{{t('show_more_byte_tools')}}</a>
    </div>
    <div class="view-more">
      <div class="flex gap-4 items-end justify-center g-check-group">
        <h5 class="flex-1">{{t('hash')}}</h5>
        <label>
          <input name="isBase64Url" type="checkbox" v-model="isHashUpper">
          {{t('upper')}}
        </label>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">MD5</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_md5))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_md5)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA 1</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha1))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha1)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA 224</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha224))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha224)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA 256</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha256))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha256)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA 384</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha384))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha384)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA 512</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha512))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha512)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA-3 256</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha3_256))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha3_256)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA-3 384</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha3_384))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha3_384)}}</pre>
        </div>
      </div>
      <div class="flex mt-3 gap-4 items-center justify-center">
        <div class="min-w-18 text-sm">SHA-3 512</div>
        <div class="language-text flex-1 overflow-x-auto overflow-y-hidden" :class="({err: !!base64Err})">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, showHash(hash_sha3_512))"></button>
          <pre class="pt-2! pb-1!">{{showHash(hash_sha3_512)}}</pre>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {ref, nextTick, onMounted, computed} from "vue";
const { site, frontmatter, page, isDark, lang, localeIndex } = useData();
const root = computed(() => `/${localeIndex.value}`.replace(/^\/root/, ''));
import CryptoJS from "crypto-js";
import {
  DatUint8Array,
} from "saro-dat";
import {doCopyToClipboard, fromBase64, fromHex, toUtf8} from "../src/comm";
import {useData} from "vitepress";
import {useTranslate} from "../src/langs";

const {t} = useTranslate();
const hex = ref('');
const hexErr = ref('');
const base64 = ref('');
const isBase64Url = ref(true);
const isBase64Pad = ref(false);
const base64Err = ref('');
const text = ref('');
const textErr = ref('');
const size = ref(0);

const isHashUpper = ref(false);
const hash_md5 = ref('');
const hash_sha1 = ref('');
const hash_sha224 = ref('');
const hash_sha256 = ref('');
const hash_sha384 = ref('');
const hash_sha512 = ref('');
const hash_sha3_256 = ref('');
const hash_sha3_384 = ref('');
const hash_sha3_512 = ref('');

const refText = ref<HTMLTextAreaElement|null>(null);
const refBase64 = ref<HTMLTextAreaElement|null>(null);
const refHex = ref<HTMLTextAreaElement|null>(null);

function showHash(hash: string): string {
  if (hash.length > 0) {
    return isHashUpper.value ? hash.toUpperCase() : hash.toLowerCase();
  } else {
    return t('error');
  }
}

function clear() {
  hex.value = '';
  hexErr.value = '';
  base64.value = '';
  base64Err.value = '';
  text.value = '';
  textErr.value = '';
  hash_md5.value = '';
  hash_sha1.value = '';
  hash_sha224.value = '';
  hash_sha256.value = '';
  hash_sha384.value = '';
  hash_sha512.value = '';
  hash_sha3_256.value = '';
  hash_sha3_384.value = '';
  hash_sha3_512.value = '';
}

async function doHash(buf: Uint8Array<ArrayBuffer>) {
  const wa = CryptoJS.lib.WordArray.create(buf);
  hash_md5.value = CryptoJS.MD5(wa).toString();
  hash_sha1.value = CryptoJS.SHA1(wa).toString();
  hash_sha224.value = CryptoJS.SHA224(wa).toString();
  hash_sha256.value = CryptoJS.SHA256(wa).toString();
  hash_sha384.value = CryptoJS.SHA384(wa).toString();
  hash_sha512.value = CryptoJS.SHA512(wa).toString();
  hash_sha3_256.value = CryptoJS.SHA3(wa, { outputLength: 256 }).toString();
  hash_sha3_384.value = CryptoJS.SHA3(wa, { outputLength: 384 }).toString();
  hash_sha3_512.value = CryptoJS.SHA3(wa, { outputLength: 512 }).toString();
}

function doInput(type: string, v: string) {
  nextTick(() => {
    clear();
    switch (type) {
      case 'hex': doInputHex(v); break;
      case 'base64': doInputBase64(v); break;
      case 'text': doInputText(v); break;
    }
  })
}

function changeBase64Option() {
  if (!base64Err.value) {
    doInput('hex', hex.value);
  } else {
    doInput('base64', base64.value);
  }

}

function doInputText(v: string) {
  text.value = v;
  const buf = DatUint8Array.from(v);
  base64.value = buf.toBase64({ alphabet: isBase64Url.value ? 'base64url' : 'base64', omitPadding: !isBase64Pad.value });
  hex.value = DatUint8Array.toHex(buf, true).toUpperCase();
  size.value = buf.length;
  if (!toUtf8(buf).pass) {
    textErr.value = t('err_invalid_utf8');
  }
  doHash(buf).then();
}

function evtHexCursor(e: KeyboardEvent) {
  if (refHex.value) {
    if (e.key === 'Backspace') {
      let el = refHex.value as HTMLTextAreaElement;
      let st = el.selectionStart;
      let v = el.value;

      if (st === el.selectionEnd && st > 2 && st < (v.length - 1) && v.substring(st - 1, st) === ' ') {
        el.selectionStart = el.selectionEnd = st - 1;
        e.preventDefault();
      }
    } else if (e.key.length == 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!'abcdef0123456789'.includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
    }
  }
}

function doInputHex(v: string) {
  clear();
  let bytesRes = fromHex(v);
  let buf = bytesRes.data;
  let hexText = DatUint8Array.toHex(buf, true).toUpperCase();
  if (bytesRes.odd) {
    hexText = hexText.substring(0, hexText.length - 1);
    buf = buf.slice(0, buf.length - 1);
    hexErr.value = t('err_odd_hex');
  }
  let textRes = toUtf8(buf);
  if (!textRes.pass) {
    textErr.value = t('err_invalid_utf8');
  }
  text.value = textRes.data;
  base64.value = buf.toBase64({ alphabet: isBase64Url.value ? 'base64url' : 'base64', omitPadding: !isBase64Pad.value });
  if (refHex.value) {
    const el = refHex.value as HTMLTextAreaElement;
    let st = el.selectionStart;
    let stn = el.value.substring(0, st).replace(/\s+/g, '').length;
    stn = stn + Math.floor(stn / 2);
    nextTick(() => {
      if (el.value.length > stn) {
        el.selectionStart = stn;
        el.selectionEnd = stn;
      }
    });
  }
  hex.value = hexText;
  size.value = buf.length;
  doHash(buf as Uint8Array<ArrayBuffer>).then();
}


function doInputBase64(v: string) {
  v = v.trim().replace(/[^a-zA-Z0-9+/=\-_]+/g, '');
  if (isBase64Url.value) {
    v = v.replace(/\+/g, '-').replace(/\//g, '_');
  } else {
    v = v.replace(/-/g, '+').replace(/_/g, '/');
  }
  let res = fromBase64(v);
  if (res.pass) {
    let buf = res.data;
    let textRes = toUtf8(buf);
    if (!textRes.pass) {
      textErr.value = t('err_invalid_utf8');
    }
    text.value = textRes.data;
    base64.value = v;
    hex.value = DatUint8Array.toHex(buf, true).toUpperCase();
    doHash(buf as Uint8Array<ArrayBuffer>).then();
  } else {
    base64Err.value = t('err_invalid_base64') + (isBase64Url.value ? ' (URL)' : '');
    base64.value = v;
  }
  size.value = res.data.length;
  if (refBase64.value) {
    let el = refBase64.value
    let ss = el.selectionStart;
    let se = el.selectionEnd;
    if (ss > 0 && ss == se) {
      nextTick(() => {
        let nsl = el.selectionStart;
        if (nsl > el.value.indexOf('=')) {
          el.selectionStart = el.selectionEnd = el.value.indexOf('=');
        }
      })
    }
  }
}

onMounted(() => doHash(new Uint8Array()))

</script>


<style scoped>
@reference 'tailwindcss';
@custom-variant light (&:where(html.light *));
@custom-variant dark (&:where(html.dark *));
@variant dark (&:where(.dark, .dark *));

textarea {
  white-space: pre-wrap !important; /* 무조건 줄바꿈을 허용하도록 강제 */
  word-break: break-all !important;
  @apply font-mono;
}
textarea.err, div.err {
  @apply bg-[#ff000020]!
}
.err-msg {
  @apply text-red-500;
}

.simple {
  .view-simple { @apply block!; }
  .view-more { @apply hidden!; }
}


</style>
