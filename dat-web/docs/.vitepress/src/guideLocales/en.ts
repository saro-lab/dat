import type { SharedGuideLocale } from './types'

export const enGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'Libraries',
    intro: "Select the DAT client for your application's language. Every client uses the same DAT and certificate specifications, and provides local certificate management and DAT CMS synchronization.",
    criteriaTitle: 'How to choose',
    criteriaBody: 'A service that issues DATs must be able to use full certificates. A service that only verifies and decrypts should use ECDSA verify-only certificates and the CMS verify-only role.',
    flowTitle: 'Guide structure',
    flowBody: 'Each library guide covers installation, the simplest issuance and verification flow, DAT CMS connection, synchronization policy, shutdown, and error handling.',
  },
  library: {
    titleSuffix: 'Library',
    install: 'Installation',
    quickTitle: 'Quick start',
    quickIntro: 'This complete flow retrieves certificates from CMS, creates a DAT containing JSON data, and verifies it.',
    stepTitle: 'Step by step',
    connectTitle: '1. Connect to CMS',
    connectBody: 'An issuing service uses a token for full certificates. Synchronizing immediately at startup prevents issuance before certificates are available.',
    issueTitle: '2. Issue a DAT',
    issueBody: 'This example puts public JSON in `plain` and protected user information as JSON in `secure`.',
    parseTitle: '3. Verify a DAT',
    parseBody: '`parse` checks expiration and the signature, then decrypts `secure`. Use only a payload returned after successful verification.',
    functionsTitle: 'Key functions',
    functionHeader: 'Function',
    purposeHeader: 'Purpose',
    dataTitle: 'Data regions',
    plainBody: 'bytes that are signed but not encrypted.',
    secureBody: 'encrypted bytes.',
    payloadBody: 'trust it only after `parse` succeeds.',
    optionsTitle: 'Options beyond JSON',
    optionsBody: 'The examples use familiar JSON. For faster processing, binary data can avoid JSON serialization and parsing while reducing data size.',
    formatsBody: 'Store simple values as text, or place structured data in binary formats such as Protobuf or MessagePack in `plain` and `secure`.',
    verifyTitle: 'Verify-only services',
    verifyBody: 'A service that does not issue DATs uses the verify-only option and a verify-only token, and calls only `parse`.',
    lifecycleTitle: 'Shutdown and errors',
    errorsBefore: 'Use ',
    errorsLink: 'error codes and retry classifications',
    errorsAfter: ' instead of error messages.',
  },
  guides: {
    rust: {
      binaryNote: 'Because `issue` currently accepts strings, encode arbitrary bytes as Base64Url or Hex, then decode them again after verification.',
      lifecycle: 'The automatic synchronization task ends when the final `Arc<DatCmsManager>` is dropped.',
      apiPurposes: ['Synchronizes certificates immediately.', 'Creates a DAT with the current issuing certificate.', 'Verifies a DAT and returns its payload.', 'Returns the last synchronization error.'],
    },
    java: {
      binaryNote: 'The `ByteArray` overload stores and retrieves bytes directly without an additional format.',
      lifecycle: '`DatCmsManager` is `AutoCloseable`; close it with `use` or `close()`.',
      apiPurposes: ['Synchronizes certificates immediately and reports failure.', 'Creates a DAT and returns a DatResult.', 'Verifies a DAT and returns a Payload.', 'Returns the last background synchronization error.'],
    },
    javascript: {
      binaryNote: 'Pass a `Uint8Array` or `ArrayBuffer` and retrieve the original bytes through `plainBytes` and `secureBytes`.',
      lifecycle: 'Call `stop()` at shutdown to clean up timers and in-progress requests.',
      apiPurposes: ['Synchronizes certificates immediately.', 'Creates a DAT string asynchronously.', 'Verifies a DAT and returns a DatPayload.', 'Returns the last synchronization error.'],
    },
    python: {
      binaryNote: 'Pass `bytes` directly and retrieve them through `plain_bytes` and `secure_bytes`.',
      lifecycle: 'When automatic synchronization is enabled, call `stop()` at shutdown.',
      apiPurposes: ['Synchronizes certificates immediately.', 'Creates a DAT string.', 'Verifies a DAT and returns a DatPayload.', 'Returns the last synchronization error.'],
    },
    csharp: {
      binaryNote: 'Use the `byte[]` overload and `PlainBytes` and `SecureBytes`.',
      lifecycle: 'Use `await using` to clean up the manager and background synchronization.',
      apiPurposes: ['Synchronizes certificates immediately.', 'Creates a DAT string.', 'Verifies a DAT and returns a Payload.', 'Returns the last synchronization error.'],
    },
    go: {
      binaryNote: 'Go strings can contain bytes. Pass a byte slice as a `string`, then convert the result back to `[]byte`.',
      lifecycle: 'When automatic synchronization is enabled, use `defer cms.Close()` to guarantee cleanup.',
      apiPurposes: ['Synchronizes certificates immediately.', 'Returns a DAT string and an error.', 'Returns a verified Payload and an error.', 'Returns the last synchronization error.'],
    },
    ruby: {
      binaryNote: 'Pass binary strings and retrieve them through `plain_bytes` and `secure_bytes`.',
      lifecycle: 'When automatic synchronization is enabled, call `stop` to end the background thread.',
      apiPurposes: ['Synchronizes certificates immediately.', 'Creates a DAT string.', 'Verifies a DAT and returns a DatPayload.', 'Returns the last synchronization error.'],
    },
    c: {
      binaryNote: 'The current C issuance API accepts NUL-terminated strings. Encode arbitrary bytes as Base64Url or Hex, and read the result using the payload lengths.',
      lifecycle: 'Release `dat`, `payload`, and `cms` with their respective cleanup functions.',
      apiPurposes: ['Synchronizes certificates immediately.', 'Allocates and returns a DAT string.', 'Allocates and returns a verified payload.', 'Returns the last synchronization error.'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* Use plain_bytes and secure_bytes with their respective lengths. */`,
      binary: `/* Encode data containing NUL first because issue accepts C strings. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS creates certificates, stores them in a database, and delivers the appropriate certificates to issuing and verifying services. Protocol behavior is described in the ',
    specLink: 'DAT CMS specification',
    introAfter: '.',
    configTitle: 'Create a runtime configuration',
    dockerTitle: 'Run with Docker',
    dockerBody: 'Run the container as a non-root user. When using SQLite, mount a writable data directory. Pass tokens and database passwords through a secret-injection mechanism rather than command history.',
    databaseTitle: 'Database',
    databaseBody1: 'Use `DB_URI` to configure a SQLite, PostgreSQL, or MySQL connection. MariaDB connects through the MySQL protocol. CMS caches certificate query results as a snapshot and continues serving the last successful snapshot when a storage refresh fails temporarily.',
    databaseBody2: '`DB_CACHE_SECS` sets the snapshot refresh interval, while `DB_QUERY_TIMEOUT_SECS` limits refresh queries. If no successful snapshot exists and storage cannot be read, the service returns `DAT_STORE_UNAVAILABLE`.',
    rolesTitle: 'Access roles',
    roleHeaders: ['Environment variable', 'Permission', 'Used by'],
    roleRows: [
      ['Register certificates and retrieve the protected version', 'Operations'],
      ['Retrieve full certificates', 'DAT issuing services'],
      ['Retrieve verify-only certificates', 'Verification and decryption services'],
    ],
    rolesNote: "Each variable accepts comma-separated alphanumeric tokens. If a role's token list is empty, that role's endpoints are opened and a warning is logged.",
    certificateTitle: 'Certificate generation',
    certificateBody: 'The master role registers a certificate by specifying the signature algorithm, encryption algorithm, propagation delay, issuance period, and TTL. During the propagation delay, services synchronize the new certificate before it becomes issuable.',
    clientTitle: 'Client integration',
    clientSteps: [
      'Use the full token and full-certificate endpoint for issuing services.',
      'Use the verify token and verify-only option for verifying services.',
      'Check the result of the first synchronization; if startup must fail, call the immediate synchronization API.',
      'When automatic synchronization is enabled, close the manager during application shutdown.',
    ],
    libraryBefore: 'See the ',
    libraryLink: 'library guides',
    libraryAfter: " for each language's builder and shutdown behavior.",
    operationsTitle: 'Operational checks',
    operationsItems: [
      '`/health` and `/version/api` report status without authentication.',
      '`/version` requires the master token when that role is configured.',
      'Collect logs from standard output and standard error.',
      'Forward shutdown signals and allow time for the database and scheduler to close.',
    ],
    kubernetesTitle: 'Kubernetes',
    kubernetesBody: 'Match the container port and probes to the service port, and mount the data directory with write access for the non-root user. Inject tokens and database connection details through Secrets.',
  },
}
