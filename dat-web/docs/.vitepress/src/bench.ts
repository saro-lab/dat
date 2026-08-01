/**
 * 언어별 성능 측정 결과.
 *
 * ⚠️ 수치는 **실측으로만** 채운다. 각 포트의 벤치마크를 같은 기계·같은 워크로드로
 * 직접 돌려 얻은 값만 넣고, 추정치나 그럴듯한 숫자를 지어 넣지 않는다. 측정하지
 * 못한 포트는 행을 비워 두는 것이 맞다 — 빈 배열이면 BenchChart가 아무것도
 * 렌더하지 않으므로 문서에 컴포넌트를 미리 심어 두어도 안전하다.
 *
 * 값을 채울 때는 BENCH_ENV(측정 환경)와 BENCH_WORKLOAD(워크로드)도 함께 적는다.
 * 환경 없이 적힌 숫자는 비교 근거가 되지 못한다.
 *
 * ── 아래 수치의 측정 방법 (2026-08-01) ──────────────────────────────────
 * 공식 클라이언트가 **같은 인증서 문자열 하나**를 import 하고, 같은 페이로드
 * (plain `"user-1234"`, secure `"session-secret"`)로 매니저 경로
 * (`manager.issue` / `manager.parse`)를 단일 스레드에서 돌렸다. parse 는 서명
 * 검증과 secure 복호화를 모두 포함한다. 포트마다 워밍업 후 best-of-3 을 두 번
 * 반복해 그중 최소값을 취했고, 두 실행 사이의 편차는 최대 7% 였다.
 *
 * BenchEntry 는 지표를 하나만 담을 수 있으므로 차트가 쓰는 `opsPerSec` 는
 * **왕복(issue 1회 + parse 1회 = 1 op)** 처리량이다. 측정된 issue/parse 개별
 * 값은 `issueNs`/`parseNs` 에 그대로 남겨 두었다(차트는 읽지 않는다).
 */

export type BenchEntry = {
  /** Display name of the run, e.g. `Rust`. */
  target: string
  /** Locale-relative path of the matching library page, e.g. `/libs/cargo-dat`. */
  link?: string
  /** Completed operations per second — the number the bars are scaled by. */
  opsPerSec: number
  /** Wall-clock milliseconds for the whole run. */
  ms: number
  /** Short qualifier printed next to the row, e.g. the algorithm used. */
  note?: string
  /** 측정된 issue 1회 비용(ns). 차트에는 쓰이지 않는 원본 기록. */
  issueNs?: number
  /** 측정된 parse 1회 비용(ns, 서명 검증 + 복호화 포함). 원본 기록. */
  parseNs?: number
}

/** Hardware every row below was measured on. Empty until a real run fills it in. */
export const BENCH_ENV =
  'Apple M4 · macOS 26.6 · rustc 1.97.1, go 1.26.3, Node 25.9.0, Python 3.14.4, ' +
  'Ruby 4.0.5, .NET 10.0.302, OpenJDK 25.0.1, clang 21 -O2 + OpenSSL 3.6.3'

/** Workload every row below was measured with, e.g. `issue + parse, 100,000 ops`. */
export const BENCH_WORKLOAD =
  'HMAC-SHA256-MFS + IV-AES256-GCM, 단일 스레드, issue+parse 왕복 100,000회 환산'

/** Measured runs. Empty by design — see the warning above. */
export const BENCH_DATA: BenchEntry[] = [
  {
    target: 'Go',
    link: '/libs/go-saro-dat',
    opsPerSec: 1_233_046,
    ms: 81.1,
    issueNs: 468.6,
    parseNs: 342.4,
  },
  {
    target: 'Rust',
    link: '/libs/cargo-dat',
    opsPerSec: 764_584,
    ms: 130.8,
    issueNs: 991.6,
    parseNs: 316.3,
  },
  {
    target: 'Java / Kotlin',
    link: '/libs/maven-me.saro-dat',
    opsPerSec: 523_725,
    ms: 190.9,
    issueNs: 947.7,
    parseNs: 961.7,
  },
  {
    target: 'C / C++',
    link: '/libs/vcpkg-dat',
    opsPerSec: 418_480,
    ms: 239.0,
    issueNs: 1258.4,
    parseNs: 1131.2,
  },
  {
    target: 'C#',
    link: '/libs/nuget-saro-dat',
    opsPerSec: 201_082,
    ms: 497.3,
    issueNs: 2438.4,
    parseNs: 2534.7,
  },
  {
    target: 'Python',
    link: '/libs/pypi-saro-dat',
    opsPerSec: 152_915,
    ms: 654.0,
    issueNs: 3017.3,
    parseNs: 3522.3,
  },
  {
    target: 'Ruby',
    link: '/libs/gems-saro-dat',
    opsPerSec: 89_590,
    ms: 1116.2,
    issueNs: 5212.0,
    parseNs: 5950.0,
  },
  {
    target: 'JavaScript',
    link: '/libs/npm-saro-dat',
    opsPerSec: 20_438,
    ms: 4892.8,
    // WebCrypto(subtle)의 호출당 오버헤드가 지배적이다. 같은 기계에서 라이브러리를
    // 거치지 않은 subtle.sign(HMAC) 단독 호출이 9.1µs, subtle.encrypt(AES-GCM)가
    // 10.6µs 였으므로, 이 수치는 구현 비효율이 아니라 런타임 API 비용이다.
    note: 'WebCrypto subtle 호출 오버헤드가 지배적',
    issueNs: 24291.2,
    parseNs: 24637.0,
  },
]

/** The runs, fastest first. */
export function getAllBenches(): BenchEntry[] {
  return [...BENCH_DATA].sort((a, b) => b.opsPerSec - a.opsPerSec)
}
