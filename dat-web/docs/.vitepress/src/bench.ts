export type BenchEntry = {
  target: string
  link?: string
  opsPerSec: number
  ms: number
  note?: string
  issueNs?: number
  parseNs?: number
}

export const BENCH_ENV =
  'Apple M4 · macOS 26.6 · rustc 1.97.1, go 1.26.3, Node 25.9.0, Python 3.14.4, ' +
  'Ruby 4.0.5, .NET 10.0.302, OpenJDK 25.0.1, clang 21 -O2 + OpenSSL 3.6.3'

export const BENCH_WORKLOAD =
  'HMAC-SHA256-MFS + IV-AES256-GCM, 단일 스레드, issue+parse 왕복 100,000회 환산'

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
    note: 'WebCrypto subtle 호출 오버헤드가 지배적',
    issueNs: 24291.2,
    parseNs: 24637.0,
  },
]

export function getAllBenches(): BenchEntry[] {
  return [...BENCH_DATA].sort((a, b) => b.opsPerSec - a.opsPerSec)
}
