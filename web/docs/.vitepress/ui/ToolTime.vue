<template>
  <div>
    <div class="info">
      <h1>Infinite Unix Time</h1>
      <a class="text-sm" href="https://github.com/saro-lab/unixtime-npm">GitHub (npm/cdn)</a>
    </div>
    <div class="mt-3">{{t('unixtime_secs_ms')}}</div>
    <div class="flex gap-1">
      <div class="language-text flex-1">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, time)"></button>
        <input class="w-full text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="`unixtime (${t('seconds')})`" v-model="time" @input="doInput('time')"/>
      </div>
      <div class="language-text flex-1">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, timestamp)"></button>
        <input class="w-full text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="`unixtime (${t('millisecond')})`" v-model="timestamp" @input="doInput('timestamp')"/>
      </div>
    </div>
    <div>
      <div class="mt-3">{{t('year')}}</div>
      <div class="language-text">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, year)"></button>
        <input class="text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="t('year')" v-model="year" @input="doInput('year')"/>
      </div>
    </div>
    <div>
      <div class="mt-3">{{t('month')}}</div>
      <div class="language-text">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, month)"></button>
        <input class="text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="t('month')" v-model="month" @input="doInput('month')"/>
      </div>
    </div>
    <div>
      <div class="mt-3">{{t('day')}}</div>
      <div class="language-text">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, day)"></button>
        <input class="text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="t('day')" v-model="day" @input="doInput('day')"/>
      </div>
    </div>
    <div class="mt-3">{{t('hour')}}(24) / {{t('minute')}} / {{t('second')}} / ms</div>
    <div class="flex gap-1 items-center justify-center">
      <div class="language-text flex-1">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, hour)"></button>
        <input class="w-full text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="t('hour')" v-model="hour" @input="doInput('hour')"/>
      </div>
      <div class="language-text flex-1">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, minute)"></button>
        <input class="w-full text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="t('minute')" v-model="minute" @input="doInput('minute')"/>
      </div>
      <div class="language-text flex-1">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, second)"></button>
        <input class="w-full text-xs!" type="text" inputmode="numeric" spellcheck="false" :placeholder="t('second')" v-model="second" @input="doInput('second')"/>
      </div>
      <div class="language-text flex-1">
        <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, ms)"></button>
        <input class="w-full text-xs!" type="text" inputmode="numeric" spellcheck="false" placeholder="ms" v-model="ms" @input="doInput('ms')"/>
      </div>
    </div>


    <div>
      <div>{{outUtc}}</div>
      <div>{{outTz}}</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import {Unixtime} from "infinite-unixtime";
import {doCopyToClipboard} from "../src/comm";
import {useTranslate} from "../src/langs";

const {t} = useTranslate();

const time = ref('0');
const timestamp = ref('0');
const year = ref('0');
const month = ref('1');
const day = ref('1');
const hour = ref('0');
const minute = ref('0');
const second = ref('0');
const ms = ref('0');

const tzo = ref(new Date().getTimezoneOffset());
const outUtc = ref('');
const outTz = ref('');

function clear() {
  bind(Unixtime.now());
}

function bind(t: Unixtime) {
  time.value = t.time.toString();
  timestamp.value = t.timestamp.toString();
  year.value = t.getYear().toString()
  month.value = t.getMonth().toString();
  day.value = t.getDay().toString();
  hour.value = t.getHours().toString();
  minute.value = t.getMinutes().toString();
  second.value = t.getSeconds().toString();
  ms.value = t.getMilliseconds().toString();

  outUtc.value = t.toString(0);
  outTz.value = t.toString(tzo.value);
}


function doInput(type: string) {
  switch (type) {
    case 'time': bind(Unixtime.fromSeconds(time.value)); break;
    case 'timestamp': bind(Unixtime.fromMillis(timestamp.value)); break;
  }
}

onMounted(() => clear());

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

</style>
