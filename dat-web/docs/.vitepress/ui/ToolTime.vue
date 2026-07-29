<template>
  <div class="tt">
    <div class="flex items-end gap-3 flex-wrap">
      <h1 class="m-0!">Infinite Unix Time</h1>
      <a class="text-sm g-link" href="https://github.com/saro-lab/unixtime-npm" target="_blank" rel="noreferrer">GitHub (npm/cdn)</a>
    </div>

    <!-- 모드 칩 : Live(실시간 틱) · 타임존 · Now(현재로 점프) -->
    <div class="flex flex-wrap items-center">
      <button class="g-chip" :class="{ on: live }" @click="setLive(!live)">
        <span class="tt-dot" :class="{ 'tt-dot-live': live }"></span>{{ t('live') }}
      </button>
      <button class="g-chip" :class="{ on: dispTz === 0 }" @click="setTz(0)">UTC</button>
      <button class="g-chip" :class="{ on: dispTz === -localTzo }" @click="setTz(-localTzo)">{{ fmtTz(-localTzo) }}</button>
      <span v-if="dispTz !== 0 && dispTz !== -localTzo" class="g-chip on tt-chip-static">{{ fmtTz(dispTz) }}</span>
      <div class="flex-1"></div>
      <button class="g-chip" @click="goNow">
        <span translate="no" class="material-symbols-outlined tt-chip-icon">my_location</span>{{ t('now') }}
      </button>
    </div>

    <!-- 현재 선택 시각 리드아웃 -->
    <div class="language-text mt-3">
      <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, readout)"></button>
      <div class="tt-readout">{{ readout }}</div>
    </div>

    <!-- unixtime 초 / 밀리초 -->
    <div class="grid grid-cols-1 @min-lg:grid-cols-2 gap-x-3 gap-y-1 mt-2">
      <div>
        <div class="tt-lbl">unixtime · {{ t('seconds') }}</div>
        <div class="language-text">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, fSec)"></button>
          <input class="w-full text-sm!" type="text" inputmode="numeric" spellcheck="false" autocomplete="off"
                 v-model="fSec" @focus="onFocus('sec')" @blur="editing = ''" @input="onField('sec')"/>
        </div>
      </div>
      <div>
        <div class="tt-lbl">unixtime · {{ t('millisecond') }}</div>
        <div class="language-text">
          <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, fMillis)"></button>
          <input class="w-full text-sm!" type="text" inputmode="numeric" spellcheck="false" autocomplete="off"
                 v-model="fMillis" @focus="onFocus('millis')" @blur="editing = ''" @input="onField('millis')"/>
        </div>
      </div>
    </div>

    <!-- 날짜 스테퍼 : 연(무한 자릿수라 한 줄 전체) / 월·일 -->
    <div class="grid grid-cols-1 gap-2 mt-3">
      <div class="tt-unit">
        <div class="tt-lbl">{{ t('year') }}</div>
        <div class="tt-stepper">
          <button class="tt-step" :title="`${t('year')} -1`" @click="stepUnit('year', -1)">
            <span translate="no" class="material-symbols-outlined">remove</span>
          </button>
          <input type="text" inputmode="numeric" spellcheck="false" autocomplete="off"
                 v-model="fYear" @focus="onFocus('year')" @blur="editing = ''" @input="onField('year')"/>
          <button class="tt-step" :title="`${t('year')} +1`" @click="stepUnit('year', 1)">
            <span translate="no" class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="tt-unit" v-for="u in UNITS_DATE" :key="u.key">
          <div class="tt-lbl">{{ t(u.label) }}</div>
          <div class="tt-stepper">
            <button class="tt-step" :title="`${t(u.label)} -1`" @click="stepUnit(u.key, -1)">
              <span translate="no" class="material-symbols-outlined">remove</span>
            </button>
            <input type="text" inputmode="numeric" spellcheck="false" autocomplete="off"
                   v-model="fields[u.key].value" @focus="onFocus(u.key)" @blur="editing = ''" @input="onField(u.key)"/>
            <button class="tt-step" :title="`${t(u.label)} +1`" @click="stepUnit(u.key, 1)">
              <span translate="no" class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>
      <!-- 시간 스테퍼 : 시 / 분 / 초 / 밀리초 -->
      <div class="grid grid-cols-2 @min-lg:grid-cols-4 gap-2">
        <div class="tt-unit" v-for="u in UNITS_TIME" :key="u.key">
          <div class="tt-lbl">{{ t(u.label) }}</div>
          <div class="tt-stepper">
            <button class="tt-step" :title="`${t(u.label)} -1`" @click="stepUnit(u.key, -1)">
              <span translate="no" class="material-symbols-outlined">remove</span>
            </button>
            <input type="text" inputmode="numeric" spellcheck="false" autocomplete="off"
                   v-model="fields[u.key].value" @focus="onFocus(u.key)" @blur="editing = ''" @input="onField(u.key)"/>
            <button class="tt-step" :title="`${t(u.label)} +1`" @click="stepUnit(u.key, 1)">
              <span translate="no" class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 달력 + 시간 슬라이더 -->
    <div class="grid grid-cols-1 @min-2xl:grid-cols-[1fr_1fr] gap-3 mt-3 items-start">
      <div class="tt-panel">
        <div class="tt-cal-head">
          <button class="tt-nav" :title="`${t('year')} -1`" @click="stepUnit('year', -1)">
            <span translate="no" class="material-symbols-outlined">keyboard_double_arrow_left</span>
          </button>
          <button class="tt-nav" :title="`${t('month')} -1`" @click="stepUnit('month', -1)">
            <span translate="no" class="material-symbols-outlined">chevron_left</span>
          </button>
          <div class="tt-cal-title">{{ cal.title }}</div>
          <button class="tt-nav" :title="`${t('month')} +1`" @click="stepUnit('month', 1)">
            <span translate="no" class="material-symbols-outlined">chevron_right</span>
          </button>
          <button class="tt-nav" :title="`${t('year')} +1`" @click="stepUnit('year', 1)">
            <span translate="no" class="material-symbols-outlined">keyboard_double_arrow_right</span>
          </button>
        </div>
        <div class="tt-cal-grid">
          <div v-for="(w, i) in WEEKDAYS" :key="w" class="tt-dow" :class="{ sun: i === 0, sat: i === 6 }">{{ w }}</div>
          <button v-for="(c, i) in cal.cells" :key="i" class="tt-day"
                  :class="{ out: c.out, sel: c.sel, today: c.today, sun: i % 7 === 0, sat: i % 7 === 6 }"
                  @click="pickDay(c)">{{ c.day }}</button>
        </div>
      </div>

      <div class="tt-panel tt-sliders">
        <div v-for="s in sliders" :key="s.key" class="tt-slider">
          <span class="tt-lbl">{{ t(s.label) }}</span>
          <input type="range" :min="0" :max="s.max" :value="s.value"
                 :aria-label="t(s.label)" @input="onSlide(s.key, $event)"/>
          <span class="tt-slider-val">{{ String(s.value).padStart(s.pad, '0') }}</span>
        </div>
        <!-- 타임존 — 실존 오프셋 범위(UTC-12:00 ~ +14:00)를 15분 단위로 -->
        <div class="tt-slider tt-tz">
          <span class="tt-lbl">TZ</span>
          <input type="range" min="-720" max="840" step="15" :value="dispTz"
                 aria-label="timezone" @input="onTzSlide"/>
          <span class="tt-slider-val tt-tz-val">{{ fmtTz(dispTz) }}</span>
        </div>
      </div>
    </div>

    <!-- ISO 8601 출력 -->
    <div class="tt-lbl mt-3">ISO 8601</div>
    <div class="language-text">
      <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, isoTz)"></button>
      <div class="tt-out">{{ isoTz }}</div>
    </div>
    <div class="language-text mt-1">
      <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, isoUtc)"></button>
      <div class="tt-out">{{ isoUtc }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, shallowRef, type Ref} from "vue";
import {Unixtime} from "infinite-unixtime";
import {doCopyToClipboard} from "../src/comm";
import {useTranslate} from "../src/langs";

const {t} = useTranslate();

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UNITS_DATE = [
  {key: 'month', label: 'month'},
  {key: 'day', label: 'day'},
] as const;
const UNITS_TIME = [
  {key: 'hour', label: 'hour'},
  {key: 'minute', label: 'minute'},
  {key: 'second', label: 'second'},
  {key: 'milli', label: 'millisecond'},
] as const;

type FieldKey = 'sec' | 'millis' | 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'milli';

const ut = shallowRef(Unixtime.fromMillis(0));
/** SSR과 첫 클라이언트 렌더가 같도록 0(UTC)으로 시작해 mount 후에 실제 오프셋을 넣는다. */
const localTzo = ref(0);
/** 표시용 오프셋(분) — 사람이 읽는 방향(+540 = UTC+09:00). JS 규약과 부호가 반대다. */
const dispTz = ref(0);
const tzo = computed(() => -dispTz.value);
const live = ref(false);
/** 입력 중인 필드는 bind()가 덮어쓰지 않는다 — 타이핑 도중 커서·문자열 보존. */
const editing = ref<FieldKey | ''>('');

const fSec = ref('0');
const fMillis = ref('0');
const fYear = ref('1970');
const fields: Record<Exclude<FieldKey, 'sec' | 'millis' | 'year'>, Ref<string>> = {
  month: ref('1'),
  day: ref('1'),
  hour: ref('0'),
  minute: ref('0'),
  second: ref('0'),
  milli: ref('0'),
};

const detail = computed(() => ut.value.toDateTimeDetail(tzo.value));
const readout = computed(() => ut.value.format('yyyy-MM-dd (E) HH:mm:ss.SSS XXX', tzo.value));
const isoTz = computed(() => ut.value.toIsoString(tzo.value));
const isoUtc = computed(() => ut.value.toIsoStringUtc());

const sliders = computed(() => {
  const d = detail.value;
  return [
    {key: 'hour' as FieldKey, label: 'hour', max: 23, pad: 2, value: d.hours},
    {key: 'minute' as FieldKey, label: 'minute', max: 59, pad: 2, value: d.minutes},
    {key: 'second' as FieldKey, label: 'second', max: 59, pad: 2, value: d.seconds},
    {key: 'milli' as FieldKey, label: 'millisecond', max: 999, pad: 3, value: d.milliseconds},
  ];
});

/** 선택 시각이 속한 달의 달력. 앞뒤 달 날짜로 7의 배수를 채운다 (일요일 시작). */
const cal = computed(() => {
  const z = tzo.value;
  const d = detail.value;
  const first = Unixtime.from(d.year, d.month, 1, 0, 0, 0, 0, z);
  const lead = first.getWeek(z); // 0 = Sun
  const last = first.getLastDayOfMonth(z);
  const pmY = d.month === 1 ? d.year - 1n : d.year;
  const pmM = d.month === 1 ? 12 : d.month - 1;
  const pmLast = Unixtime.from(pmY, pmM, 1, 0, 0, 0, 0, z).getLastDayOfMonth(z);
  const nmY = d.month === 12 ? d.year + 1n : d.year;
  const nmM = d.month === 12 ? 1 : d.month + 1;
  const n = Unixtime.now().toDateTimeDetail(z);

  type Cell = { y: bigint; m: number; day: number; out: boolean; sel: boolean; today: boolean };
  const cell = (y: bigint, m: number, day: number, out: boolean): Cell => ({
    y, m, day, out,
    sel: !out && day === d.day,
    today: y === n.year && m === n.month && day === n.day,
  });

  const cells: Cell[] = [];
  for (let i = lead - 1; i >= 0; i--) cells.push(cell(pmY, pmM, pmLast - i, true));
  for (let i = 1; i <= last; i++) cells.push(cell(d.year, d.month, i, false));
  for (let i = 1; cells.length % 7 !== 0; i++) cells.push(cell(nmY, nmM, i, true));

  return {title: `${d.year}-${String(d.month).padStart(2, '0')}`, cells};
});

function fmtTz(m: number): string {
  if (!m) return 'UTC±00:00';
  const a = Math.abs(m);
  return `UTC${m < 0 ? '-' : '+'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

/** 모든 표시 필드를 다시 쓴다 — 단, 지금 입력 중인 필드는 건드리지 않는다.
    개별 getXxx() 게터는 음수 타임스탬프에서 음수 나머지를 그대로 돌려주므로,
    자리올림이 끝난 toDateTimeDetail()의 값만 쓴다. */
function bind(u: Unixtime) {
  ut.value = u;
  const d = u.toDateTimeDetail(tzo.value);
  const w = (key: FieldKey, r: Ref<string>, v: string) => {
    if (editing.value !== key) r.value = v;
  };
  w('sec', fSec, u.time.toString());
  w('millis', fMillis, u.timestamp.toString());
  w('year', fYear, d.year.toString());
  w('month', fields.month, d.month.toString());
  w('day', fields.day, d.day.toString());
  w('hour', fields.hour, d.hours.toString());
  w('minute', fields.minute, d.minutes.toString());
  w('second', fields.second, d.seconds.toString());
  w('milli', fields.milli, d.milliseconds.toString());
}

/** 일부 단위만 바꿔 시각을 재조립한다. 월이 바뀌어 날짜가 넘치면 말일로 클램프. */
function rebuild(patch: Partial<{ y: bigint; m: number; d: number; h: number; mi: number; s: number; ms: number }>) {
  const z = tzo.value;
  const dd = detail.value;
  const y = patch.y ?? dd.year;
  const m = patch.m ?? dd.month;
  const lastDay = Unixtime.from(y, m, 1, 0, 0, 0, 0, z).getLastDayOfMonth(z);
  const day = Math.min(patch.d ?? dd.day, lastDay);
  bind(Unixtime.from(y, m, day, patch.h ?? dd.hours, patch.mi ?? dd.minutes, patch.s ?? dd.seconds, patch.ms ?? dd.milliseconds, z));
}

let timer: ReturnType<typeof setInterval> | null = null;
function setLive(on: boolean) {
  live.value = on;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (on) {
    bind(Unixtime.now());
    timer = setInterval(() => bind(Unixtime.now()), 100);
  }
}

function goNow() {
  setLive(false);
  bind(Unixtime.now());
}

/** 같은 시각을 새 타임존으로 다시 표기 — 시각 자체는 바뀌지 않으므로 live도 유지 */
function setTz(m: number) {
  dispTz.value = m;
  bind(ut.value);
}

function onTzSlide(event: Event) {
  setTz(Number((event.target as HTMLInputElement).value));
}

function onFocus(key: FieldKey) {
  setLive(false);
  editing.value = key;
}

const INT = /^-?\d+$/;

function onField(key: FieldKey) {
  const z = tzo.value;
  const dd = detail.value;
  const num = (v: string, min: number, max: number): number | null => {
    if (!INT.test(v)) return null;
    const n = Number(v);
    return n >= min && n <= max ? n : null;
  };
  switch (key) {
    case 'sec':
      if (INT.test(fSec.value)) bind(Unixtime.fromSeconds(fSec.value));
      break;
    case 'millis':
      if (INT.test(fMillis.value)) bind(Unixtime.fromMillis(fMillis.value));
      break;
    case 'year':
      if (INT.test(fYear.value)) rebuild({y: BigInt(fYear.value)});
      break;
    case 'month': {
      const v = num(fields.month.value, 1, 12);
      if (v !== null) rebuild({m: v});
      break;
    }
    case 'day': {
      const lastDay = Unixtime.from(dd.year, dd.month, 1, 0, 0, 0, 0, z).getLastDayOfMonth(z);
      const v = num(fields.day.value, 1, lastDay);
      if (v !== null) rebuild({d: v});
      break;
    }
    case 'hour': {
      const v = num(fields.hour.value, 0, 23);
      if (v !== null) rebuild({h: v});
      break;
    }
    case 'minute': {
      const v = num(fields.minute.value, 0, 59);
      if (v !== null) rebuild({mi: v});
      break;
    }
    case 'second': {
      const v = num(fields.second.value, 0, 59);
      if (v !== null) rebuild({s: v});
      break;
    }
    case 'milli': {
      const v = num(fields.milli.value, 0, 999);
      if (v !== null) rebuild({ms: v});
      break;
    }
  }
}

function stepUnit(key: FieldKey, dir: 1 | -1) {
  setLive(false);
  const dd = detail.value;
  switch (key) {
    case 'year':
      rebuild({y: dd.year + BigInt(dir)});
      break;
    case 'month': {
      let m = dd.month + dir;
      let y = dd.year;
      if (m > 12) { m = 1; y += 1n; }
      else if (m < 1) { m = 12; y -= 1n; }
      rebuild({y, m});
      break;
    }
    case 'day': bind(ut.value.plusDays(dir)); break;
    case 'hour': bind(ut.value.plusHours(dir)); break;
    case 'minute': bind(ut.value.plusMinutes(dir)); break;
    case 'second': bind(ut.value.plusSeconds(dir)); break;
    case 'milli': bind(ut.value.plusMillis(dir)); break;
  }
}

function pickDay(c: { y: bigint; m: number; day: number }) {
  setLive(false);
  const dd = detail.value;
  bind(Unixtime.from(c.y, c.m, c.day, dd.hours, dd.minutes, dd.seconds, dd.milliseconds, tzo.value));
}

function onSlide(key: FieldKey, event: Event) {
  setLive(false);
  const v = Number((event.target as HTMLInputElement).value);
  if (key === 'hour') rebuild({h: v});
  else if (key === 'minute') rebuild({mi: v});
  else if (key === 'second') rebuild({s: v});
  else if (key === 'milli') rebuild({ms: v});
}

onMounted(() => {
  localTzo.value = new Date().getTimezoneOffset();
  dispTz.value = -localTzo.value; // 기본은 브라우저 타임존
  setLive(true);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
@reference 'tailwindcss';

.tt-lbl {
    @apply text-[0.7rem] font-semibold uppercase tracking-[0.07em] mt-2 mb-1;
    color: var(--c-muted);
}

/* Live 칩의 상태 점 — 켜지면 브랜드색으로 맥동 */
.tt-dot {
    @apply inline-block w-2 h-2 rounded-full mr-1.5;
    background-color: color-mix(in srgb, currentColor 35%, transparent);
}
.tt-dot-live {
    background-color: var(--c-link-1);
    animation: tt-pulse 1.2s ease-in-out infinite;
}
@keyframes tt-pulse {
    50% {
        opacity: 0.35;
    }
}
@media (prefers-reduced-motion: reduce) {
    .tt-dot-live {
        animation: none;
    }
}
.tt-chip-icon {
    @apply text-[0.85rem]! mr-1;
}

/* 큰 리드아웃 — 페이지의 "현재 값". 복사 버튼이 얹히는 코드 박스와 같은 면 */
.tt-readout {
    @apply font-mono text-center py-3 px-2 rounded-lg break-all;
    font-size: clamp(0.8rem, 2.6cqw, 1.05rem);
    background-color: var(--code-bg);
    border: 1px solid var(--code-border);
    color: var(--c-heading);
    text-shadow: none;
}

/* unixtime 입력은 전역 input 스타일을 그대로 쓰고, 스테퍼만 여기서 조립한다 */
.tt-stepper {
    @apply flex items-stretch gap-1;

    input {
        @apply flex-1 w-full text-center text-sm! px-2! py-1.5!;
    }
}
.tt-step,
.tt-nav {
    @apply flex items-center justify-center rounded-md cursor-pointer select-none px-2 transition-colors duration-150;
    color: color-mix(in srgb, var(--ctrl-fg) 75%, transparent);
    background-color: var(--ctrl-bg);
    border: 1px solid var(--ctrl-border);

    &:hover {
        color: var(--ctrl-fg-on);
        background-color: var(--ctrl-bg-hover);
        border-color: var(--ctrl-border-hover);
    }
    &:active {
        background-color: var(--ctrl-bg-on);
        border-color: var(--ctrl-border-on);
    }
    .material-symbols-outlined {
        @apply text-base!;
    }
}

/* 달력·슬라이더 공용 패널 — 컨트롤과 같은 면 위계 */
.tt-panel {
    @apply rounded-lg p-3;
    background-color: color-mix(in srgb, currentColor 4%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 7%, transparent);
}

.tt-cal-head {
    @apply flex items-center gap-1 mb-2;
}
.tt-nav {
    @apply py-1;
}
.tt-cal-title {
    @apply flex-1 text-center font-mono font-bold text-sm break-all px-1;
    color: var(--c-heading);
}
.tt-cal-grid {
    @apply grid grid-cols-7 gap-0.5;
}
.tt-dow {
    @apply text-center text-[0.68rem] font-bold uppercase py-1 select-none;
    color: var(--c-muted);
}
.tt-day {
    @apply aspect-square flex items-center justify-center rounded-md text-[0.82rem] font-mono
        cursor-pointer select-none transition-colors duration-100;
    color: var(--c-text-2);
    border: 1px solid transparent;

    &:hover {
        background-color: color-mix(in srgb, currentColor 9%, transparent);
    }
    &.out {
        opacity: 0.32;
    }
    /* 오늘 : 테두리만 — 선택과 헷갈리지 않게 */
    &.today {
        border-color: color-mix(in srgb, var(--c-link-1) 55%, transparent);
    }
    /* 선택된 날 : 칩의 "켜짐"과 같은 면 */
    &.sel {
        @apply font-bold;
        color: var(--ctrl-fg-on);
        background-color: var(--ctrl-bg-on);
        border-color: var(--ctrl-border-on);
        text-shadow: var(--ctrl-text-shadow-on);
    }
}
.tt-dow.sun, .tt-day.sun:not(.sel) { color: color-mix(in srgb, var(--c-accent-2) 80%, var(--c-text-1)); }
.tt-dow.sat, .tt-day.sat:not(.sel) { color: color-mix(in srgb, var(--c-accent-1) 80%, var(--c-text-1)); }
.tt-day.sun.out, .tt-day.sat.out { opacity: 0.32; }

/* 시간 슬라이더 — 즉시 선택. accent-color가 트랙·썸을 브랜드색으로 칠한다 */
.tt-sliders {
    @apply flex flex-col justify-center gap-1 self-stretch;
}
.tt-slider {
    @apply flex items-center gap-3;

    .tt-lbl {
        @apply my-0 w-20 shrink-0;
    }
    input[type="range"] {
        @apply flex-1 min-w-0 cursor-pointer;
        accent-color: var(--c-link-1);
    }
}
.tt-slider-val {
    @apply font-mono text-sm w-9 text-right shrink-0;
    color: var(--c-heading);
}
.tt-tz {
    @apply mt-1 pt-2;
    border-top: var(--divider);
}
.tt-tz-val {
    @apply w-auto text-xs;
}
.tt-chip-static {
    cursor: default;
}

.tt-out {
    @apply font-mono text-[0.8rem] px-3.5 py-2.5 rounded-lg break-all;
    background-color: var(--code-bg);
    border: 1px solid var(--code-border);
    text-shadow: none;
}
</style>
