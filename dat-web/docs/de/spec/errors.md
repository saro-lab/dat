# Fehlercodes

DAT-Implementierungen stellen neben lesbaren Meldungen stabile Fehlercodes bereit. Programme sollen ihr Verhalten anhand des Codes und der Wiederholungsklassifikation festlegen, ohne Meldungstexte zu vergleichen.

## Aufbau

```text
DAT_<Bereich>_<Ursache>
```

| Präfix | Bereich |
| --- | --- |
| `DAT_TOKEN_` | DAT-Zeichenfolge und Ablauf |
| `DAT_CERT_` | Zertifikat-Zeichenfolge und Zustand |
| `DAT_SIG_` | Signatur und Prüfung |
| `DAT_CRYPTO_` | Ver- und Entschlüsselung |
| `DAT_KEY_` | Schlüsselformat und Berechtigungen |
| `DAT_MANAGER_` | Zertifikat-Manager |
| `DAT_CONFIG_` | Aufrufargumente und Konfiguration |
| `DAT_INTERNAL_` | Interne runtime-Funktionen |
| `DAT_CMS_` | Synchronisierung des CMS-Clients |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS-Server |

`_UNKNOWN` wird nur für Fehler verwendet, die sich innerhalb ihres Bereichs keinem anderen Code zuordnen lassen. Dieselbe Ursache verwendet auch in unterschiedlichen Bereichen denselben Namen.

## Wiederholungsklassifikation

| Klassifikation | Bedeutung | Behandlung |
| --- | --- | --- |
| Vorübergehend | Kann nach Wiederherstellung eines externen Zustands erfolgreich sein | Nach einem backoff begrenzt wiederholen |
| Zustand | Kann nach Änderung von Zertifikatssynchronisierung oder Zeit erfolgreich sein | Erforderlichen Zustand aktualisieren und erneut versuchen |
| Dauerhaft | Schlägt mit derselben Eingabe erneut fehl | Eingabe, Konfiguration oder Code korrigieren |

## Token und Zertifikat

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
Anzahl der DAT-Felder, Zahlen oder Base64Url-Darstellung entsprechen nicht der Spezifikation. Verwerfen Sie die Eingabe.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
Der Ablaufzeitpunkt des DAT entspricht der aktuellen Zeit oder liegt davor. Ein neuer DAT ist erforderlich.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Aufbau der Zertifikat-Zeichenfolge oder Darstellung ihrer Felder ist fehlerhaft.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Für die `cid` des DAT ist kein Zertifikat vorhanden. Prüfen Sie den Synchronisierungszustand der Zertifikate.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Das benötigte Zertifikat ist möglicherweise noch nicht beim Dienst angekommen. Synchronisieren Sie sofort und bewerten Sie den Zustand erneut.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Der Startzeitpunkt des Zertifikats ist noch nicht erreicht. Prüfen Sie Systemzeit und Verteilungszeitpunkt des Zertifikats.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Der Prüfzeitraum des Zertifikats ist beendet.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
Dieselbe `cid` kommt in einer Importliste mehrfach vor. Der gesamte Import wird abgelehnt.
</ErrorCode>

## Signatur, Verschlüsselung und Schlüssel

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Die Signatur stimmt nicht mit dem Inhalt überein. Der DAT wurde möglicherweise verändert oder mit einem anderen Schlüssel signiert.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
Der AES-GCM-Authentifizierungstag stimmt nicht überein. Prüfen Sie, ob das Chiffrat verändert wurde oder das Zertifikat nicht passt.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Länge, Format oder Algorithmuskombination des Schlüssels ist ungültig.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Es wurde versucht, mit einem Zertifikat nur zur Prüfung einen DAT auszustellen. Ausstellende Dienste benötigen ein vollständiges Zertifikat.
</ErrorCode>

`DAT_SIG_MISMATCH` und `DAT_CRYPTO_TAG_MISMATCH` werden von der öffentlichen API für Sicherheitsereignisse als zutreffende Fehler klassifiziert. Eine einzelne ungültige Eingabe ist kein Dienstausfall, wiederholtes Auftreten sollte jedoch als mögliches Sicherheitsereignis beobachtet werden.

## Manager und Konfiguration

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Der Manager enthält keine Zertifikate. Importieren Sie Zertifikate oder schließen Sie die CMS-Synchronisierung ab.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Zertifikate sind vorhanden, aber aktuell kann kein vollständiges Zertifikat ausstellen. Prüfen Sie in der Ursachenkette Ablauf, Startzeit oder verify-only-Zustand.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Ein Aufrufargument oder Konfigurationswert liegt außerhalb des zulässigen Bereichs.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
Die benötigte Kryptografie- oder Netzwerkfunktion ist auf der aktuellen Plattform nicht verfügbar.
</ErrorCode>

## CMS-Client

| Code | Bedeutung | Übliche Behandlung |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Ungültiges Format der CMS URI | Konfiguration korrigieren |
| `DAT_CMS_UNAUTHORIZED` | Authentifizierung fehlgeschlagen | Token korrigieren |
| `DAT_CMS_FORBIDDEN` | Rolle besitzt keine Berechtigung | Tokenrolle prüfen |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Pfad fehlt oder weicht ab | CMS-Adresse und Pfad prüfen |
| `DAT_CMS_NETWORK` | Verbindung oder Übertragung fehlgeschlagen | Netzwerk prüfen und backoff anwenden |
| `DAT_CMS_TIMEOUT` | Timeout überschritten | Netzwerk und Timeouts anpassen |
| `DAT_CMS_SERVER_ERROR` | Fehler des CMS-Servers | Serverzustand prüfen und backoff anwenden |
| `DAT_CMS_RESPONSE_INVALID` | Ungültiges Format einer erfolgreichen Antwort | Vertrag zwischen Server und Client prüfen |
| `DAT_CMS_VERSION_RESET` | Serverversion wurde zurückgesetzt | CMS-Daten und Bereitstellung prüfen |
| `DAT_CMS_IMPORT_FAILED` | Empfangene Zertifikate konnten nicht angewandt werden | Ursachenkette prüfen |
| `DAT_CMS_STOPPED` | Beendeter Manager wurde verwendet | Neuen Manager erstellen oder Aufrufreihenfolge korrigieren |

Bibliotheken mit best-effort-Synchronisierung beim Start speichern den Fehler im Feld für den letzten Fehler. Soll der Start fehlschlagen, verwenden Sie die API zur sofortigen Synchronisierung, die den Fehler direkt zurückgibt oder auslöst.

## CMS-Server

| Code | HTTP | Bedeutung |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Token fehlt oder ist ungültig |
| `DAT_AUTH_FORBIDDEN` | 403 | Tokenrolle entspricht nicht der angeforderten Berechtigung |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Nicht unterstützter Algorithmusname |
| `DAT_REQ_NOT_FOUND` | 404·405 | Pfad oder Methode stimmen nicht überein |
| `DAT_REQ_TOO_LARGE` | 413 | Reservierter Code für Überschreitung des Limits des Anfrageinhalts |
| `DAT_STORE_UNAVAILABLE` | 503 | Speicher ist vorübergehend nicht verfügbar |
| `DAT_STORE_UNKNOWN` | 500 | Nicht klassifizierter Fehler bei der Speicherverarbeitung |

Derzeit legen Clients den Servercode aus einem nicht erfolgreichen JSON nicht unverändert offen, sondern wandeln den HTTP-Status in einen `DAT_CMS_*`-Code um. Der Code im Serverprotokoll kann daher vom Clientfehlercode abweichen.

## Prüfung nach Sprache

| Umgebung | Fehlercode | Wiederholungsklassifikation |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Fehler mit untergeordneter Ursache lassen sich über die Ausnahmekette oder die API zur Ursachenabfrage der jeweiligen Sprache untersuchen.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
