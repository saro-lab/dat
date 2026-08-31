import type { SharedGuideLocale } from './types'

export const deGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'Bibliotheken',
    intro: 'Wählen Sie den DAT-Client für die Sprache Ihrer Anwendung. Alle Clients verwenden dieselben DAT- und Zertifikatspezifikationen und bieten lokale Zertifikatsverwaltung sowie Synchronisierung mit DAT CMS.',
    criteriaTitle: 'Auswahl',
    criteriaBody: 'Ein Dienst, der DAT ausstellt, muss vollständige Zertifikate verwenden können. Ein Dienst, der nur prüft und entschlüsselt, sollte ECDSA-Zertifikate nur zur Prüfung und die verify-only-Rolle von CMS verwenden.',
    flowTitle: 'Aufbau des Leitfadens',
    flowBody: 'Jeder Bibliotheksleitfaden behandelt Installation, den einfachsten Ablauf für Ausstellung und Prüfung, die Verbindung zu DAT CMS, Synchronisierungsrichtlinie, Beendigung und Fehlerbehandlung.',
  },
  library: {
    titleSuffix: 'Bibliothek',
    install: 'Installation',
    quickTitle: 'Schnellstart',
    quickIntro: 'Dieser vollständige Ablauf ruft Zertifikate von CMS ab, erstellt einen DAT mit JSON-Daten und prüft ihn.',
    stepTitle: 'Schritt für Schritt',
    connectTitle: '1. Mit CMS verbinden',
    connectBody: 'Ein ausstellender Dienst verwendet ein Token für vollständige Zertifikate. Eine sofortige Synchronisierung beim Start verhindert die Ausstellung, bevor Zertifikate verfügbar sind.',
    issueTitle: '2. DAT ausstellen',
    issueBody: 'Dieses Beispiel legt öffentliches JSON in `plain` und geschützte Benutzerdaten als JSON in `secure` ab.',
    parseTitle: '3. DAT prüfen',
    parseBody: '`parse` prüft Ablauf und Signatur und entschlüsselt anschließend `secure`. Verwenden Sie nur ein payload, das nach erfolgreicher Prüfung zurückgegeben wurde.',
    functionsTitle: 'Wichtige Funktionen',
    functionHeader: 'Funktion',
    purposeHeader: 'Zweck',
    dataTitle: 'Datenbereiche',
    plainBody: 'signierte, aber nicht verschlüsselte Bytes.',
    secureBody: 'verschlüsselte Bytes.',
    payloadBody: 'vertrauen Sie ihm erst nach erfolgreichem `parse`.',
    optionsTitle: 'Optionen neben JSON',
    optionsBody: 'Die Beispiele verwenden das vertraute JSON. Für eine schnellere Verarbeitung können Binärdaten die Serialisierung und das Parsing von JSON vermeiden und gleichzeitig die Datenmenge verringern.',
    formatsBody: 'Speichern Sie einfache Werte als Text oder strukturierte Daten in Binärformaten wie Protobuf oder MessagePack in `plain` und `secure`.',
    verifyTitle: 'Dienste nur zur Prüfung',
    verifyBody: 'Ein Dienst, der keine DAT ausstellt, verwendet die verify-only-Option und ein verify-only-Token und ruft ausschließlich `parse` auf.',
    lifecycleTitle: 'Beendigung und Fehler',
    errorsBefore: 'Verwenden Sie ',
    errorsLink: 'Fehlercodes und Wiederholungsklassifikationen',
    errorsAfter: ' anstelle von Fehlermeldungen.',
  },
  guides: {
    rust: {
      binaryNote: 'Da `issue` derzeit strings akzeptiert, codieren Sie beliebige Bytes als Base64Url oder Hex und decodieren Sie sie nach der Prüfung wieder.',
      lifecycle: 'Die Aufgabe zur automatischen Synchronisierung endet, wenn der letzte `Arc<DatCmsManager>` verworfen wird.',
      apiPurposes: ['Synchronisiert Zertifikate sofort.', 'Erstellt einen DAT mit dem aktuellen ausstellenden Zertifikat.', 'Prüft einen DAT und gibt sein payload zurück.', 'Gibt den letzten Synchronisierungsfehler zurück.'],
    },
    java: {
      binaryNote: 'Der `ByteArray`-overload speichert und liest Bytes ohne zusätzliches Format direkt.',
      lifecycle: '`DatCmsManager` implementiert `AutoCloseable`; schließen Sie ihn mit `use` oder `close()`.',
      apiPurposes: ['Synchronisiert Zertifikate sofort und meldet Fehler.', 'Erstellt einen DAT und gibt ein DatResult zurück.', 'Prüft einen DAT und gibt ein Payload zurück.', 'Gibt den letzten Fehler der Hintergrundsynchronisierung zurück.'],
    },
    javascript: {
      binaryNote: 'Übergeben Sie ein `Uint8Array` oder `ArrayBuffer` und lesen Sie die ursprünglichen Bytes über `plainBytes` und `secureBytes` aus.',
      lifecycle: 'Rufen Sie beim Beenden `stop()` auf, um Timer und laufende Anfragen zu bereinigen.',
      apiPurposes: ['Synchronisiert Zertifikate sofort.', 'Erstellt asynchron eine DAT-Zeichenfolge.', 'Prüft einen DAT und gibt ein DatPayload zurück.', 'Gibt den letzten Synchronisierungsfehler zurück.'],
    },
    python: {
      binaryNote: 'Übergeben Sie `bytes` direkt und lesen Sie sie über `plain_bytes` und `secure_bytes` aus.',
      lifecycle: 'Rufen Sie bei aktivierter automatischer Synchronisierung beim Beenden `stop()` auf.',
      apiPurposes: ['Synchronisiert Zertifikate sofort.', 'Erstellt eine DAT-Zeichenfolge.', 'Prüft einen DAT und gibt ein DatPayload zurück.', 'Gibt den letzten Synchronisierungsfehler zurück.'],
    },
    csharp: {
      binaryNote: 'Verwenden Sie den `byte[]`-overload sowie `PlainBytes` und `SecureBytes`.',
      lifecycle: 'Verwenden Sie `await using`, um Manager und Hintergrundsynchronisierung zu bereinigen.',
      apiPurposes: ['Synchronisiert Zertifikate sofort.', 'Erstellt eine DAT-Zeichenfolge.', 'Prüft einen DAT und gibt ein Payload zurück.', 'Gibt den letzten Synchronisierungsfehler zurück.'],
    },
    go: {
      binaryNote: 'Go-Strings können Bytes enthalten. Übergeben Sie einen Byte-Slice als `string` und konvertieren Sie das Ergebnis anschließend wieder in `[]byte`.',
      lifecycle: 'Verwenden Sie bei aktivierter automatischer Synchronisierung `defer cms.Close()`, um die Bereinigung sicherzustellen.',
      apiPurposes: ['Synchronisiert Zertifikate sofort.', 'Gibt eine DAT-Zeichenfolge und einen Fehler zurück.', 'Gibt ein geprüftes Payload und einen Fehler zurück.', 'Gibt den letzten Synchronisierungsfehler zurück.'],
    },
    ruby: {
      binaryNote: 'Übergeben Sie Binärstrings und lesen Sie sie über `plain_bytes` und `secure_bytes` aus.',
      lifecycle: 'Rufen Sie bei aktivierter automatischer Synchronisierung `stop` auf, um den Hintergrundthread zu beenden.',
      apiPurposes: ['Synchronisiert Zertifikate sofort.', 'Erstellt eine DAT-Zeichenfolge.', 'Prüft einen DAT und gibt ein DatPayload zurück.', 'Gibt den letzten Synchronisierungsfehler zurück.'],
    },
    c: {
      binaryNote: 'Die aktuelle C-API zur Ausstellung akzeptiert NUL-terminierte Strings. Codieren Sie beliebige Bytes als Base64Url oder Hex und lesen Sie das Ergebnis anhand der payload-Längen.',
      lifecycle: 'Geben Sie `dat`, `payload` und `cms` mit den jeweiligen Bereinigungsfunktionen frei.',
      apiPurposes: ['Synchronisiert Zertifikate sofort.', 'Allokiert eine DAT-Zeichenfolge und gibt sie zurück.', 'Allokiert ein geprüftes payload und gibt es zurück.', 'Gibt den letzten Synchronisierungsfehler zurück.'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* plain_bytes und secure_bytes jeweils mit der zugehörigen Länge verwenden. */`,
      binary: `/* Daten mit NUL zuerst codieren, da issue C-Strings akzeptiert. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS erstellt Zertifikate, speichert sie in einer Datenbank und übermittelt die passenden Zertifikate an ausstellende und prüfende Dienste. Das Protokollverhalten beschreibt die ',
    specLink: 'DAT-CMS-Spezifikation',
    introAfter: '.',
    configTitle: 'Laufzeitkonfiguration erstellen',
    dockerTitle: 'Mit Docker ausführen',
    dockerBody: 'Führen Sie den Container als Benutzer ohne root-Rechte aus. Binden Sie bei SQLite ein beschreibbares Datenverzeichnis ein. Übergeben Sie Tokens und Datenbankpasswörter über einen Mechanismus zur Einbindung von Secrets statt über den Befehlsverlauf.',
    databaseTitle: 'Datenbank',
    databaseBody1: 'Konfigurieren Sie mit `DB_URI` eine Verbindung zu SQLite, PostgreSQL oder MySQL. MariaDB verbindet sich über das MySQL-Protokoll. CMS speichert Ergebnisse von Zertifikatsabfragen als Snapshot im Cache und stellt bei einem vorübergehenden Fehler der Speicheraktualisierung weiterhin den letzten erfolgreichen Snapshot bereit.',
    databaseBody2: '`DB_CACHE_SECS` legt das Aktualisierungsintervall des Snapshot fest, `DB_QUERY_TIMEOUT_SECS` begrenzt die Aktualisierungsabfragen. Existiert kein erfolgreicher Snapshot und kann der Speicher nicht gelesen werden, gibt der Dienst `DAT_STORE_UNAVAILABLE` zurück.',
    rolesTitle: 'Zugriffsrollen',
    roleHeaders: ['Umgebungsvariable', 'Berechtigung', 'Verwendet von'],
    roleRows: [
      ['Zertifikate registrieren und geschützte Version abrufen', 'Betrieb'],
      ['Vollständige Zertifikate abrufen', 'DAT-ausstellende Dienste'],
      ['Zertifikate nur zur Prüfung abrufen', 'Prüf- und Entschlüsselungsdienste'],
    ],
    rolesNote: 'Jede Variable akzeptiert durch Kommas getrennte alphanumerische Tokens. Ist die Tokenliste einer Rolle leer, werden ihre endpoints geöffnet und eine Warnung protokolliert.',
    certificateTitle: 'Zertifikate erstellen',
    certificateBody: 'Die master-Rolle registriert ein Zertifikat mit Signaturalgorithmus, Verschlüsselungsalgorithmus, Ausbreitungsverzögerung, Ausstellungszeitraum und TTL. Während der Ausbreitungsverzögerung synchronisieren die Dienste das neue Zertifikat, bevor es ausstellungsfähig wird.',
    clientTitle: 'Clientintegration',
    clientSteps: [
      'Verwenden Sie für ausstellende Dienste das vollständige Token und den endpoint für vollständige Zertifikate.',
      'Verwenden Sie für Prüfdienste das Prüftoken und die verify-only-Option.',
      'Prüfen Sie das Ergebnis der ersten Synchronisierung. Muss der Start fehlschlagen, rufen Sie die API zur sofortigen Synchronisierung auf.',
      'Schließen Sie den Manager bei aktivierter automatischer Synchronisierung während der Anwendungsbeendigung.',
    ],
    libraryBefore: 'Die ',
    libraryLink: 'Bibliotheksleitfäden',
    libraryAfter: ' beschreiben builder und Beendigungsverhalten der einzelnen Sprachen.',
    operationsTitle: 'Betriebsprüfungen',
    operationsItems: [
      '`/health` und `/version/api` melden den Zustand ohne Authentifizierung.',
      '`/version` erfordert das master token, wenn diese Rolle konfiguriert ist.',
      'Erfassen Sie Protokolle aus Standardausgabe und Standardfehlerausgabe.',
      'Leiten Sie Beendigungssignale weiter und lassen Sie Datenbank und scheduler genug Zeit zum Schließen.',
    ],
    kubernetesTitle: 'Kubernetes',
    kubernetesBody: 'Stimmen Sie Containerport und probes auf den Dienstport ab und binden Sie das Datenverzeichnis mit Schreibzugriff für den Benutzer ohne root-Rechte ein. Fügen Sie Tokens und Datenbankverbindungsdaten über Secrets ein.',
  },
}
