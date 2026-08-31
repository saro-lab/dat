export type LibraryGuide = {
  title: string
  repository: 'Cargo' | 'Maven' | 'Npm' | 'Pypi' | 'Nuget' | 'Go' | 'Gems' | 'Vcpkg'
  packageId: string
  language: string
  quick: string
  connect: string
  issue: string
  parse: string
  parseEn?: string
  binary: string
  binaryEn?: string
  binaryNote: string
  binaryNoteEn: string
  lifecycle: string
  lifecycleEn: string
  api: { name: string; purpose: string; purposeEn: string }[]
}

export const libraryGuides: Record<string, LibraryGuide> = {
  rust: {
    title: 'Rust', repository: 'Cargo', packageId: 'dat', language: 'rust',
    quick: `let cms = DatCmsManager::builder()
    .url(&std::env::var("DAT_CMS_URL")?)?
    .token(std::env::var("DAT_CMS_TOKEN")?)
    .build().await;

cms.sync().await?;
let dat = cms.issue(
    r#"{"route":"orders"}"#,
    r#"{"userId":42,"role":"USER"}"#,
)?;
let payload = cms.parse(&dat)?;

println!("{}", payload.plain_text()?);
println!("{}", payload.secure_text()?);`,
    connect: `let cms = DatCmsManager::builder()
    .url(&std::env::var("DAT_CMS_URL")?)?
    .token(std::env::var("DAT_CMS_TOKEN")?)
    .build().await;
cms.sync().await?;`,
    issue: `let dat = cms.issue(
    r#"{"route":"orders"}"#,
    r#"{"userId":42,"role":"USER"}"#,
)?;`,
    parse: `let payload = cms.parse(&dat)?;
let route = payload.plain_text()?;
let user = payload.secure_text()?;`,
    binary: `let bytes = [0x00, 0xff, 0x10, 0x80];
let encoded = dat::util::encode_base64_url(bytes);
let dat = cms.issue("file", &encoded)?;

let payload = cms.parse(&dat)?;
let restored = dat::util::decode_base64_url(payload.secure_text()?)?;`,
    binaryNote: '현재 `issue`는 문자열을 받으므로 임의 바이트는 Base64Url 또는 Hex로 인코딩해 넣고, 검증 후 다시 디코딩합니다.',
    binaryNoteEn: 'Because `issue` currently accepts strings, encode arbitrary bytes as Base64Url or Hex, then decode them again after verification.',
    lifecycle: '마지막 `Arc<DatCmsManager>`가 해제되면 자동 동기화 작업도 끝납니다.',
    lifecycleEn: 'The automatic synchronization task ends when the final `Arc<DatCmsManager>` is dropped.',
    api: [
      {name: 'sync().await', purpose: '인증서를 즉시 동기화합니다.', purposeEn: 'Synchronizes certificates immediately.'},
      {name: 'issue(plain, secure)', purpose: '현재 발급용 인증서로 DAT를 만듭니다.', purposeEn: 'Creates a DAT with the current issuing certificate.'},
      {name: 'parse(dat)', purpose: 'DAT를 검증하고 payload를 돌려줍니다.', purposeEn: 'Verifies a DAT and returns its payload.'},
      {name: 'last_error().await', purpose: '마지막 동기화 오류를 확인합니다.', purposeEn: 'Returns the last synchronization error.'},
    ],
  },
  java: {
    title: 'Java / Kotlin', repository: 'Maven', packageId: 'me.saro:dat', language: 'kts',
    quick: `DatCmsManager.builder()
    .uri(System.getenv("DAT_CMS_URL"))
    .token(System.getenv("DAT_CMS_TOKEN"))
    .build().use { cms ->
        cms.syncOrThrow()
        val dat = cms.issue(
            """{"route":"orders"}""",
            """{"userId":42,"role":"USER"}"""
        ).getOrThrow()

        val payload = cms.parse(dat).getOrThrow()
        println(payload.plain)
        println(payload.secure)
    }`,
    connect: `val cms = DatCmsManager.builder()
    .uri(System.getenv("DAT_CMS_URL"))
    .token(System.getenv("DAT_CMS_TOKEN"))
    .build()
cms.syncOrThrow()`,
    issue: `val dat = cms.issue(
    """{"route":"orders"}""",
    """{"userId":42,"role":"USER"}"""
).getOrThrow()`,
    parse: `val payload = cms.parse(dat).getOrThrow()
val route = payload.plain
val user = payload.secure`,
    binary: `val plain = byteArrayOf(0x01, 0x02)
val secure = byteArrayOf(0x00, 0x7f, 0xff.toByte())
val dat = cms.issue(plain, secure).getOrThrow()

val payload = cms.parse(dat).getOrThrow()
val restored: ByteArray = payload.secureBytes`,
    binaryNote: '`ByteArray` 오버로드를 사용하면 별도 포맷 없이 바이트를 그대로 넣고 꺼낼 수 있습니다.',
    binaryNoteEn: 'The `ByteArray` overload stores and retrieves bytes directly without an additional format.',
    lifecycle: '`DatCmsManager`는 `AutoCloseable`이므로 `use` 또는 `close()`로 닫습니다.',
    lifecycleEn: '`DatCmsManager` is `AutoCloseable`; close it with `use` or `close()`.',
    api: [
      {name: 'syncOrThrow()', purpose: '인증서를 즉시 동기화하고 실패를 전달합니다.', purposeEn: 'Synchronizes certificates immediately and reports failure.'},
      {name: 'issue(plain, secure)', purpose: 'DAT를 만들고 DatResult를 반환합니다.', purposeEn: 'Creates a DAT and returns a DatResult.'},
      {name: 'parse(dat)', purpose: 'DAT를 검증하고 Payload를 반환합니다.', purposeEn: 'Verifies a DAT and returns a Payload.'},
      {name: 'lastError()', purpose: '백그라운드 동기화 오류를 확인합니다.', purposeEn: 'Returns the last background synchronization error.'},
    ],
  },
  javascript: {
    title: 'JavaScript / TypeScript', repository: 'Npm', packageId: 'saro-dat', language: 'typescript',
    quick: `const cms = await DatCmsManager.builder()
  .uri(process.env.DAT_CMS_URL!)
  .token(process.env.DAT_CMS_TOKEN!)
  .build();

await cms.syncOrThrow();
const dat = await cms.issue(
  JSON.stringify({ route: "orders" }),
  JSON.stringify({ userId: 42, role: "USER" }),
);
const payload = await cms.parse(dat);

console.log(payload.plain);
console.log(payload.secure);
cms.stop();`,
    connect: `const cms = await DatCmsManager.builder()
  .uri(process.env.DAT_CMS_URL!)
  .token(process.env.DAT_CMS_TOKEN!)
  .build();
await cms.syncOrThrow();`,
    issue: `const dat = await cms.issue(
  JSON.stringify({ route: "orders" }),
  JSON.stringify({ userId: 42, role: "USER" }),
);`,
    parse: `const payload = await cms.parse(dat);
const route = payload.plain;
const user = payload.secure;`,
    binary: `const secure = new Uint8Array([0x00, 0xff, 0x10, 0x80]);
const dat = await cms.issue(new Uint8Array([0x01]), secure);

const payload = await cms.parse(dat);
const restored = new Uint8Array(payload.secureBytes);`,
    binaryNote: '`Uint8Array` 또는 `ArrayBuffer`를 넘기고 `plainBytes`·`secureBytes`로 원본 바이트를 받습니다.',
    binaryNoteEn: 'Pass a `Uint8Array` or `ArrayBuffer` and retrieve the original bytes through `plainBytes` and `secureBytes`.',
    lifecycle: '종료할 때 `stop()`을 호출해 타이머와 진행 중인 요청을 정리합니다.',
    lifecycleEn: 'Call `stop()` at shutdown to clean up timers and in-progress requests.',
    api: [
      {name: 'syncOrThrow()', purpose: '인증서를 즉시 동기화합니다.', purposeEn: 'Synchronizes certificates immediately.'},
      {name: 'issue(plain, secure)', purpose: 'DAT 문자열을 비동기로 만듭니다.', purposeEn: 'Creates a DAT string asynchronously.'},
      {name: 'parse(dat)', purpose: 'DAT를 검증하고 DatPayload를 반환합니다.', purposeEn: 'Verifies a DAT and returns a DatPayload.'},
      {name: 'lastError()', purpose: '마지막 동기화 오류를 확인합니다.', purposeEn: 'Returns the last synchronization error.'},
    ],
  },
  python: {
    title: 'Python', repository: 'Pypi', packageId: 'saro-dat', language: 'python',
    quick: `manager = (DatCmsManager.builder()
    .uri(os.environ["DAT_CMS_URL"])
    .token(os.environ["DAT_CMS_TOKEN"])
    .build())

try:
    manager.sync_or_raise()
    dat = manager.issue(
        plain='{"route":"orders"}',
        secure='{"userId":42,"role":"USER"}',
    )
    payload = manager.parse(dat)
    print(payload.plain)
    print(payload.secure)
finally:
    manager.stop()`,
    connect: `manager = (DatCmsManager.builder()
    .uri(os.environ["DAT_CMS_URL"])
    .token(os.environ["DAT_CMS_TOKEN"])
    .build())
manager.sync_or_raise()`,
    issue: `dat = manager.issue(
    plain='{"route":"orders"}',
    secure='{"userId":42,"role":"USER"}',
)`,
    parse: `payload = manager.parse(dat)
route = payload.plain
user = payload.secure`,
    binary: `secure = bytes([0x00, 0xff, 0x10, 0x80])
dat = manager.issue(plain=b"\\x01", secure=secure)

payload = manager.parse(dat)
restored = payload.secure_bytes`,
    binaryNote: '`bytes`를 직접 전달하고 `plain_bytes`·`secure_bytes`로 꺼냅니다.',
    binaryNoteEn: 'Pass `bytes` directly and retrieve them through `plain_bytes` and `secure_bytes`.',
    lifecycle: '자동 동기화를 사용하면 종료할 때 `stop()`을 호출합니다.',
    lifecycleEn: 'When automatic synchronization is enabled, call `stop()` at shutdown.',
    api: [
      {name: 'sync_or_raise()', purpose: '인증서를 즉시 동기화합니다.', purposeEn: 'Synchronizes certificates immediately.'},
      {name: 'issue(plain, secure)', purpose: 'DAT 문자열을 만듭니다.', purposeEn: 'Creates a DAT string.'},
      {name: 'parse(dat)', purpose: 'DAT를 검증하고 DatPayload를 반환합니다.', purposeEn: 'Verifies a DAT and returns a DatPayload.'},
      {name: 'last_error()', purpose: '마지막 동기화 오류를 확인합니다.', purposeEn: 'Returns the last synchronization error.'},
    ],
  },
  csharp: {
    title: 'C# / .NET', repository: 'Nuget', packageId: 'saro-dat', language: 'csharp',
    quick: `await using var cms = await DatCmsManager.Builder()
    .Uri(Environment.GetEnvironmentVariable("DAT_CMS_URL")!)
    .Token(Environment.GetEnvironmentVariable("DAT_CMS_TOKEN")!)
    .BuildAsync();

await cms.SyncOrThrow();
string dat = cms.Issue(
    """{"route":"orders"}""",
    """{"userId":42,"role":"USER"}"""
);
Payload payload = cms.Parse(dat);

Console.WriteLine(payload.Plain);
Console.WriteLine(payload.Secure);`,
    connect: `await using var cms = await DatCmsManager.Builder()
    .Uri(Environment.GetEnvironmentVariable("DAT_CMS_URL")!)
    .Token(Environment.GetEnvironmentVariable("DAT_CMS_TOKEN")!)
    .BuildAsync();
await cms.SyncOrThrow();`,
    issue: `string dat = cms.Issue(
    """{"route":"orders"}""",
    """{"userId":42,"role":"USER"}"""
);`,
    parse: `Payload payload = cms.Parse(dat);
string route = payload.Plain;
string user = payload.Secure;`,
    binary: `byte[] secure = [0x00, 0xff, 0x10, 0x80];
string dat = cms.Issue([0x01], secure);

Payload payload = cms.Parse(dat);
byte[] restored = payload.SecureBytes;`,
    binaryNote: '`byte[]` 오버로드와 `PlainBytes`·`SecureBytes`를 사용합니다.',
    binaryNoteEn: 'Use the `byte[]` overload and `PlainBytes` and `SecureBytes`.',
    lifecycle: '`await using`으로 매니저와 백그라운드 동기화를 정리합니다.',
    lifecycleEn: 'Use `await using` to clean up the manager and background synchronization.',
    api: [
      {name: 'SyncOrThrow()', purpose: '인증서를 즉시 동기화합니다.', purposeEn: 'Synchronizes certificates immediately.'},
      {name: 'Issue(plain, secure)', purpose: 'DAT 문자열을 만듭니다.', purposeEn: 'Creates a DAT string.'},
      {name: 'Parse(dat)', purpose: 'DAT를 검증하고 Payload를 반환합니다.', purposeEn: 'Verifies a DAT and returns a Payload.'},
      {name: 'LastError', purpose: '마지막 동기화 오류를 확인합니다.', purposeEn: 'Returns the last synchronization error.'},
    ],
  },
  go: {
    title: 'Go', repository: 'Go', packageId: 'github.com/saro-lab/dat/dat-go/v4', language: 'go',
    quick: `builder, err := dat.NewDatCmsManagerBuilder().Url(os.Getenv("DAT_CMS_URL"))
if err != nil { return err }
cms, err := builder.Token(os.Getenv("DAT_CMS_TOKEN")).Build()
if err != nil { return err }
defer cms.Close()

if err := cms.Sync(); err != nil { return err }
token, err := cms.Issue(
    "{\\\"route\\\":\\\"orders\\\"}",
    "{\\\"userId\\\":42,\\\"role\\\":\\\"USER\\\"}",
)
if err != nil { return err }
payload, err := cms.Parse(token)
if err != nil { return err }

fmt.Println(payload.PlainText())
fmt.Println(payload.SecureText())`,
    connect: `builder, err := dat.NewDatCmsManagerBuilder().Url(os.Getenv("DAT_CMS_URL"))
if err != nil { return err }
cms, err := builder.Token(os.Getenv("DAT_CMS_TOKEN")).Build()
if err != nil { return err }
if err := cms.Sync(); err != nil { return err }`,
    issue: `token, err := cms.Issue(
    "{\\\"route\\\":\\\"orders\\\"}",
    "{\\\"userId\\\":42,\\\"role\\\":\\\"USER\\\"}",
)`,
    parse: `payload, err := cms.Parse(token)
if err != nil { return err }
route := payload.PlainText()
user := payload.SecureText()`,
    binary: `secure := []byte{0x00, 0xff, 0x10, 0x80}
token, err := cms.Issue(string([]byte{0x01}), string(secure))
if err != nil { return err }

payload, err := cms.Parse(token)
restored := []byte(payload.SecureText())`,
    binaryNote: 'Go 문자열은 바이트를 담을 수 있습니다. 바이트 슬라이스를 `string`으로 전달하고 결과를 다시 `[]byte`로 변환합니다.',
    binaryNoteEn: 'Go strings can contain bytes. Pass a byte slice as a `string`, then convert the result back to `[]byte`.',
    lifecycle: '자동 동기화를 사용하면 `defer cms.Close()`로 종료를 보장합니다.',
    lifecycleEn: 'When automatic synchronization is enabled, use `defer cms.Close()` to guarantee cleanup.',
    api: [
      {name: 'Sync()', purpose: '인증서를 즉시 동기화합니다.', purposeEn: 'Synchronizes certificates immediately.'},
      {name: 'Issue(plain, secure)', purpose: 'DAT 문자열과 error를 반환합니다.', purposeEn: 'Returns a DAT string and an error.'},
      {name: 'Parse(dat)', purpose: '검증된 Payload와 error를 반환합니다.', purposeEn: 'Returns a verified Payload and an error.'},
      {name: 'LastError()', purpose: '마지막 동기화 오류를 확인합니다.', purposeEn: 'Returns the last synchronization error.'},
    ],
  },
  ruby: {
    title: 'Ruby', repository: 'Gems', packageId: 'saro-dat', language: 'ruby',
    quick: `manager = Saro::Dat::DatCmsManager.builder
  .uri(ENV.fetch("DAT_CMS_URL"))
  .token(ENV.fetch("DAT_CMS_TOKEN"))
  .build

begin
  manager.sync_or_raise
  dat = manager.issue(
    '{"route":"orders"}',
    '{"userId":42,"role":"USER"}'
  )
  payload = manager.parse(dat)
  puts payload.plain
  puts payload.secure
ensure
  manager.stop
end`,
    connect: `manager = Saro::Dat::DatCmsManager.builder
  .uri(ENV.fetch("DAT_CMS_URL"))
  .token(ENV.fetch("DAT_CMS_TOKEN"))
  .build
manager.sync_or_raise`,
    issue: `dat = manager.issue(
  '{"route":"orders"}',
  '{"userId":42,"role":"USER"}'
)`,
    parse: `payload = manager.parse(dat)
route = payload.plain
user = payload.secure`,
    binary: `secure = [0x00, 0xff, 0x10, 0x80].pack("C*")
dat = manager.issue("\\x01".b, secure)

payload = manager.parse(dat)
restored = payload.secure_bytes`,
    binaryNote: '바이너리 문자열을 전달하고 `plain_bytes`·`secure_bytes`로 꺼냅니다.',
    binaryNoteEn: 'Pass binary strings and retrieve them through `plain_bytes` and `secure_bytes`.',
    lifecycle: '자동 동기화를 사용하면 `stop`을 호출해 백그라운드 스레드를 끝냅니다.',
    lifecycleEn: 'When automatic synchronization is enabled, call `stop` to end the background thread.',
    api: [
      {name: 'sync_or_raise', purpose: '인증서를 즉시 동기화합니다.', purposeEn: 'Synchronizes certificates immediately.'},
      {name: 'issue(plain, secure)', purpose: 'DAT 문자열을 만듭니다.', purposeEn: 'Creates a DAT string.'},
      {name: 'parse(dat)', purpose: 'DAT를 검증하고 DatPayload를 반환합니다.', purposeEn: 'Verifies a DAT and returns a DatPayload.'},
      {name: 'last_error', purpose: '마지막 동기화 오류를 확인합니다.', purposeEn: 'Returns the last synchronization error.'},
    ],
  },
  c: {
    title: 'C / C++', repository: 'Vcpkg', packageId: 'dat', language: 'c',
    quick: `dat_cms_manager_t *cms = NULL;
dat_error_t err = dat_cms_manager_create(
    getenv("DAT_CMS_URL"), getenv("DAT_CMS_TOKEN"),
    false, 60, log_fn, NULL, &cms);
if (err != DAT_SUCCESS) return 1;

err = dat_cms_manager_sync(cms);
char *dat = NULL;
if (err == DAT_SUCCESS) err = dat_cms_manager_issue(
    cms, "{\\\"route\\\":\\\"orders\\\"}",
    "{\\\"userId\\\":42,\\\"role\\\":\\\"USER\\\"}", &dat);

dat_payload_t *payload = NULL;
if (err == DAT_SUCCESS) err = dat_cms_manager_parse(cms, dat, &payload);
if (err == DAT_SUCCESS) {
    printf("%.*s\\n", (int)payload->plain_len, payload->plain_bytes);
    printf("%.*s\\n", (int)payload->secure_len, payload->secure_bytes);
}

free(dat);
dat_payload_free(payload);
dat_cms_manager_free(cms);`,
    connect: `dat_cms_manager_t *cms = NULL;
dat_error_t err = dat_cms_manager_create(
    getenv("DAT_CMS_URL"), getenv("DAT_CMS_TOKEN"),
    false, 60, log_fn, NULL, &cms);
if (err == DAT_SUCCESS) err = dat_cms_manager_sync(cms);`,
    issue: `char *dat = NULL;
err = dat_cms_manager_issue(
    cms, "{\\\"route\\\":\\\"orders\\\"}",
    "{\\\"userId\\\":42,\\\"role\\\":\\\"USER\\\"}", &dat);`,
    parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* plain_bytes와 secure_bytes는 각 길이와 함께 사용 */`,
    parseEn: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* Use plain_bytes and secure_bytes with their respective lengths. */`,
    binary: `/* issue 입력은 C 문자열이므로 NUL이 포함된 데이터는 먼저 인코딩합니다. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    binaryEn: `/* Encode data containing NUL first because issue accepts C strings. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    binaryNote: '현재 C 발급 API는 NUL 종료 문자열을 받습니다. 임의 바이트는 Base64Url 또는 Hex로 인코딩하고 payload 길이를 사용해 읽습니다.',
    binaryNoteEn: 'The current C issuance API accepts NUL-terminated strings. Encode arbitrary bytes as Base64Url or Hex, and read the result using the payload lengths.',
    lifecycle: '`dat`, `payload`, `cms`를 각각 알맞은 해제 함수로 정리합니다.',
    lifecycleEn: 'Release `dat`, `payload`, and `cms` with their respective cleanup functions.',
    api: [
      {name: 'dat_cms_manager_sync', purpose: '인증서를 즉시 동기화합니다.', purposeEn: 'Synchronizes certificates immediately.'},
      {name: 'dat_cms_manager_issue', purpose: 'DAT 문자열을 할당해 반환합니다.', purposeEn: 'Allocates and returns a DAT string.'},
      {name: 'dat_cms_manager_parse', purpose: '검증된 payload를 할당해 반환합니다.', purposeEn: 'Allocates and returns a verified payload.'},
      {name: 'dat_cms_manager_last_error', purpose: '마지막 동기화 오류를 확인합니다.', purposeEn: 'Returns the last synchronization error.'},
    ],
  },
}
