# Fehlercodes

Dies sind die gemeinsamen Fehlercodes der offiziell von DAT unterstützten Service-Bibliotheken.

Jeder Code trägt zwei Werte — **Auswirkung** und **Wiederholung** — und einige zusätzlich die Markierung **Verdacht**.

## Auswirkung — was der Dienst abbekommt

Das ist der Maßstab für Alarme. Betrachtet wird nur: „Steht der Dienst gerade still?"

| Auswirkung | Bedeutung | Beispiel |
| --- | --- | --- |
| <span class="lg lg-critical">Kritisch</span> | Der Dienst oder eine bestimmte Funktion **steht still.** Ausstellung unmöglich, Synchronisierung dauerhaft fehlgeschlagen, Initialisierung fehlgeschlagen | Der ausstellende Server hat kein einziges verwendbares Zertifikat |
| <span class="lg lg-partial">Teilweise</span> | Einzelne Anfragen oder Zyklen schlagen fehl, der Dienst läuft aber weiter. Meist erholt er sich von selbst | Ein CMS-Zyklus schlägt fehl. Mit den vorhandenen Zertifikaten läuft alles weiter |
| <span class="lg lg-none">Keine Auswirkung</span> | Eine Anfrage wird abgelehnt, mehr nicht | Ein manipuliertes Token kommt an. Aussortieren genügt |

**Keine Auswirkung** ist kein Alarmfall. Wenn die gesamte Bereitschaft nachsehen müsste, weil einmal eine fehlerhafte Eingabe eintraf, wird der Alarm bedeutungslos.

## Verdacht — bei Dauerhaftigkeit untersuchen

Codes mit der Markierung <span class="lg lg-suspect">Verdacht</span> sind **im Einzelfall Teil des normalen Betriebs**. Clients können jederzeit falsche Werte senden, und es ist genau die Aufgabe der Bibliothek, diese auszusortieren.

Treten solche Fehler jedoch **dauerhaft oder gehäuft aus einer bestimmten Quelle** auf, liegt einer von zwei Fällen vor.

- **Konfigurationsfehler** — ein fehlerhaftes Deployment, verbliebene Clients einer alten Version oder nicht zueinander passende Zertifikate.
- **Angriffsversuch** — der Versuch, mit manipulierten Tokens oder Schlüsseln die Prüfung zu bestehen, oder das Abtasten nach gültigen Werten.

Deshalb ist es richtig, für diese Codes **die Anzahl als Metrik zu erfassen**. Gemeldet wird erst beim Überschreiten eines Schwellenwerts.

## Wiederholung

| Wiederholung | Bedeutung |
| --- | --- |
| <span class="lg lg-transient">Vorübergehend</span> | Löst sich mit einem erneuten Versuch nach Backoff |
| <span class="lg">Dauerhaft</span> | Nicht wiederholen. Konfiguration oder Eingabe muss korrigiert werden |
| <span class="lg">Status</span> | Kein Fehler, sondern ein Signal |

---

## Token

Probleme mit der empfangenen Token-Zeichenkette selbst.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="Anfrage ablehnen">
Die durch Punkte getrennten Teile sind nicht genau fünf, <code>expire</code> ist nicht rein dezimal, <code>cid</code> ist nicht rein hexadezimal, <code>plain</code> oder <code>secure</code> ist kein base64url, oder ein Zahlenfeld überschreitet den darstellbaren Ganzzahlbereich.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="Neuausstellung des Tokens veranlassen">
<code>expire &lt;= now</code>. <strong>Auch der exakte Zeitpunkt gilt als abgelaufen</strong> — bei <code>expire == now</code> ist das Token bereits abgelaufen.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="Logs prüfen">
Ein Token-Fehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

::: tip Ablauf und Formatfehler niemals vermischen
Die Reaktionen sind gegensätzlich — Ablauf ist ein normales Lebensende, hier genügt es, das Token erneuern zu lassen; ein Formatfehler bedeutet, dass das Token von vornherein nicht von uns stammt und abgelehnt werden muss.

Beim Parsen wird **zuerst die Struktur festgestellt**, danach werden die Werte betrachtet. Eine Zeichenkette wie `"1.2.3"` mit zu wenigen Teilen ist kein abgelaufenes Token, sondern von vornherein kein Token — also `DAT_TOKEN_MALFORMED`.

Auch ein Vorzeichen im Feld `expire`, etwa `+100`, ist kein Ablauf, sondern ein Formatfehler. Erlaubt sind ausschließlich reine ASCII-Ziffern.
:::

---

## Zertifikat

Das Format der Zertifikatszeichenkette und die Frage, ob dieses Zertifikat jetzt verwendbar ist.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="Zertifikat neu ausrollen">
Die durch Punkte getrennten Teile sind nicht genau acht, das Parsen von <code>cid</code>, <code>start</code>, <code>duration</code> oder <code>ttl</code> ist fehlgeschlagen, ein Schlüsselfeld ist kein base64url, oder <code>start + duration + ttl</code> überschreitet u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="Zertifikat erneuern">
<code>start + duration + ttl &lt; now</code>. Vollständig abgelaufen — weder Ausstellung noch Prüfung sind möglich.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="Warten">
<code>now &lt; start</code>. Das Ausstellungsfenster ist noch nicht geöffnet.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="Neues Zertifikat ausrollen">
<code>now &gt; start + duration</code>, aber die TTL läuft noch. Ausstellen ist nicht mehr möglich, nur noch prüfen.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="Deployment-Konfiguration prüfen">
Ein Zertifikat, das nur den öffentlichen Schlüssel ohne privaten Signaturschlüssel enthält. Prüfen ist möglich, Ausstellen nicht.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="Anfrage ablehnen">
Zur <code>cid</code> des Tokens liegt kein Zertifikat vor. Entweder ein gefälschtes Token oder ein fehlerhaftes Ausrollen.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="Nach der Synchronisierung erneut versuchen">
Diese <code>cid</code> wurde noch nicht vom CMS empfangen. Tritt kurz nach dem Ausrollen eines neuen Zertifikats auf.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="Serverantwort prüfen">
In der importierten Liste kommt dieselbe <code>cid</code> mehr als einmal vor.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="Logs prüfen">
Ein Zertifikatsfehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

`DAT_CERT_NOT_FOUND` und `DAT_CERT_NOT_SYNCED` sehen gleich aus, erfordern aber unterschiedliche Reaktionen. Beim ersten handelt es sich um eine `cid`, die wir nie ausgestellt haben — Warten hilft nicht. Der zweite löst sich, sobald die Synchronisierung erfolgt ist.

Ein einzelnes `DAT_CERT_NOT_FOUND` sortiert man einfach aus; steigt die Zahl plötzlich, ist entweder das Ausrollen aus dem Tritt geraten oder es kursieren gefälschte Tokens.

---

## Signatur

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="Sitzung sperren, Security-Log">
Die Signaturprüfung endete mit einer <strong>Abweichung</strong>. Der HMAC-Wert stimmt nicht überein oder ECDSA verify liefert false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="Anfrage ablehnen">
Der Signaturteil ist leer, kein base64url, die Länge von ECDSA <code>r‖s</code> passt nicht zur Kurve, oder die DER-Umwandlung ist fehlgeschlagen.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="Konfiguration des ausstellenden Servers prüfen">
Es wurde versucht, mit einem Verify-only-Schlüssel zu signieren. Zur Laufzeit liegt kein privater Schlüssel vor.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="Schlüsseltyp und Bibliothek prüfen">
Die Signatur- bzw. Prüfoperation <strong>konnte selbst nicht ausgeführt werden.</strong> Falscher Schlüsseltyp, freigegebenes Handle oder ein interner Fehler der Krypto-Bibliothek.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="Logs prüfen">
Ein Signaturfehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

::: warning Abweichung und Backend-Fehler nicht vermischen
Die beiden Codes liegen auf entgegengesetzten Achsen.

- `DAT_SIG_MISMATCH` — lediglich eine nicht passende eingehende Signatur, also **ohne Auswirkung auf den Dienst**; bei Dauerhaftigkeit jedoch ein Fall für **Verdacht**.
- `DAT_SIG_BACKEND` — die Prüfoperation selbst lief nicht, also **ein Problem auf unserer Seite**, und kein Verdachtsfall.

Wird ein falscher Schlüsseltyp oder ein Bibliotheksfehler als „Signaturabweichung" gemeldet, mischt sich eine Situation, in der tatsächlich unser Code defekt ist, unter die Angriffsindikatoren. Umgekehrt fällt eine echte Fälschung, die als Backend-Fehler eingestuft wird, komplett aus den Verdachtsmetriken heraus.
:::

---

## Verschlüsselung

Probleme bei der Ver- und Entschlüsselung der secure-Payload.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="Sitzung sperren, Security-Log">
Das AES-GCM-Authentifizierungs-Tag stimmt nicht. Entweder wurde secure manipuliert oder der Zertifikatsschlüssel ist ein anderer.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="Anfrage ablehnen">
Der Chiffretext ist nicht leer, aber höchstens so lang wie der IV (12 Byte), oder die Eingabe überschreitet die Implementierungsgrenze (etwa <code>INT_MAX</code>).
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="Plattformunterstützung prüfen">
Die Ver- bzw. Entschlüsselung konnte nicht ausgeführt werden. Die Plattform unterstützt GCM nicht oder die Kontextinitialisierung ist fehlgeschlagen.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="Logs prüfen">
Ein Ver-/Entschlüsselungsfehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

**Eine leere secure-Payload ist kein Fehler.** Leere Eingabe wird zu leerer Ausgabe, und es wird kein Code erzeugt.

Auf dem Pfad ohne Signaturprüfung ist das GCM-Tag die **einzige Integritätsprüfung**. Deshalb wird `DAT_CRYPTO_TAG_MISMATCH` nicht mit anderen Entschlüsselungsfehlern in einen Code zusammengefasst.

---

## Schlüssel

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="Schlüssel austauschen">
Die Schlüssellänge passt nicht zum deklarierten Algorithmus (HMAC 32/48/64, AES 16/32), der Punkt liegt nicht auf der Kurve, <code>d ∉ [1,n-1]</code>, das Format ist nicht unkomprimiert (0x04), oder privater und öffentlicher Schlüssel bilden kein Paar.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="Algorithmus wechseln">
Für ein Verfahren der HMAC-Familie wurde ein Verify-only-Export angefordert.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="Logs prüfen">
Ein Schlüsselfehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

**Drei ähnlich aussehende, aber verschiedene Fälle:**

| Code | Bedeutung |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **Strukturelle Grenze des Algorithmus.** HMAC ist symmetrisch und kennt keinen öffentlichen Schlüssel |
| `DAT_SIG_KEY_MISSING` | **Laufzeitzustand.** In diesem Schlüssel steckt derzeit kein privater Schlüssel |
| `DAT_CERT_VERIFY_ONLY` | **Ausrollform.** Dieses Zertifikat wurde nur zum Prüfen ausgerollt |

---

## Manager

Der Zustand des Objekts, das Zertifikate hält und zum Ausstellen und Prüfen verwendet.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="CMS-Verbindung prüfen">
Es liegt kein einziges Zertifikat vor. Entweder vor dem Import oder nach einer fehlgeschlagenen ersten CMS-Synchronisierung.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="Anhand des Grundes (cause) entscheiden — siehe Tabelle unten">
Zertifikate sind vorhanden, aber keines davon ist derzeit zum Ausstellen verwendbar. <strong>Der Grund wird mitgeliefert.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="Aufrufenden Code korrigieren">
Ein bereits freigegebener Manager oder ein freigegebenes Zertifikat wurde verwendet.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="Logs prüfen">
Ein Manager-Fehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

Der Grund (`cause`) von `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` ist einer von vieren. **Je nach Ursache ist das Vorgehen völlig unterschiedlich.**

| Grund | Bedeutung | Wiederholung | Reaktion |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Vor Beginn des Ausstellungsfensters | **Vorübergehend** | Löst sich durch Warten |
| `DAT_CERT_ISSUANCE_ENDED` | Ausstellungsfenster beendet, nur noch Prüfung möglich | Dauerhaft | Ein neues Zertifikat muss ausgerollt werden |
| `DAT_CERT_EXPIRED` | Der gesamte Bestand ist abgelaufen | Dauerhaft | Die Zertifikate müssen erneuert werden |
| `DAT_CERT_VERIFY_ONLY` | Der gesamte Bestand dient nur der Prüfung | Dauerhaft | **Ein Fehler in der Deployment-Konfiguration** |

Ist der ausstellende Server so konfiguriert, dass er nur reine Prüfzertifikate erhält, erscheint `DAT_CERT_VERIFY_ONLY`. Warten hilft hier nie, deshalb ist dies kein Fall für eine Wiederholung.

---

## Konfiguration

Probleme mit den vom Aufrufer übergebenen Werten. Die `CONFIG`-Familie besteht durchweg aus **Fehlern, die im Code behoben werden müssen**; treten sie im Betrieb auf, ist das Deployment fehlerhaft.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="Algorithmusnamen prüfen">
Unbekannter Algorithmusname. Er muss exakt der Wire-Schreibweise entsprechen (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="Aufrufenden Code korrigieren">
Ein Pflichtargument ist null, liegt außerhalb des zulässigen Bereichs (negativer Zeitwert, <code>interval &lt;= 0</code>), hat einen nicht unterstützten Typ (in dynamisch typisierten Sprachen eine Zahl oder ein Boolescher Wert als Payload), oder der zu signierende Body ist leer.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="URI korrigieren">
Die URI des CMS-Servers entspricht nicht der Spezifikation. Nicht parsebar, Schema ist weder http noch https, oder es hängt ein Pfad bzw. eine Query daran.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="Logs prüfen">
Ein Konfigurationsfehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

---

## Intern

Probleme der Ausführungsumgebung und der Laufzeit.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="Deployment und Plattform prüfen">
Das Krypto-Backend oder die Laufzeit-API fehlt vollständig. <code>crypto.subtle</code> ist nicht vorhanden, die Plattform unterstützt AES-GCM nicht, oder die Laufzeitversion ist zu alt.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="Logs prüfen">
Fehlgeschlagene Speicherzuweisung, fehlgeschlagene Zufallszahlenerzeugung, fehlgeschlagene Sperrenanforderung, oder ein als unerreichbar entworfener Zweig wurde erreicht.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` löst sich, indem die Deployment-Umgebung korrigiert wird; `DAT_INTERNAL_UNKNOWN` ist meist eine Laufzeitstörung oder ein Bibliotheksfehler.

---

## CMS-Synchronisierung

Ohne CMS-Synchronisierung treten diese Codes nicht auf.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="Nach Backoff erneut versuchen">
DNS-Fehler, abgelehnte Verbindung, TLS-Fehler, <strong>Timeout</strong>. Der Timeout hat keinen eigenen Code, sondern ist hier enthalten — die Reaktion ist dieselbe.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="Token-Konfiguration prüfen">
Der Server hat mit 401 geantwortet. Das Token fehlt oder ist falsch.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="Token-Stufe prüfen">
Der Server hat mit 403 geantwortet. Das Token ist gültig, hat aber keine Berechtigung für diesen Endpunkt.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="URL-Konfiguration prüfen">
Der Server hat mit 404 geantwortet. Die URL ist falsch.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="Nach Backoff erneut versuchen">
Der Server hat mit 5xx geantwortet.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="Statuscode prüfen">
Eine Nicht-2xx-Antwort, die keinem der obigen Fälle entspricht.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="Serverversion prüfen">
Die Antwort enthält keine Versionszeile, die Versionszeile ist nicht rein dezimal, oder sie überschreitet den Wertebereich.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="CERT_* / KEY_* in cause prüfen">
Die Antwort kam an, aber die Zertifikate konnten nicht übernommen werden. <strong>Die Ursache steckt in <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="Wird automatisch behandelt">
Der Server hat eine ältere Version zurückgegeben als unsere. Das ist die Anweisung zur vollständigen Neusynchronisierung.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="Auf die erste Synchronisierung warten">
Es gab noch keine einzige erfolgreiche Synchronisierung.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
Die vorherige Synchronisierung läuft noch, deshalb wurde dieser Zyklus übersprungen. Kein Fehler.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="Build-Optionen prüfen">
Die CMS-Funktion ist nicht Teil des Builds. Das Feature ist deaktiviert oder CURL fehlt.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="Logs prüfen">
Ein CMS-Fehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

Die Codes, bei denen die Synchronisierung als **dauerhaft fehlgeschlagen** gilt (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`, `IMPORT_FAILED`), sind allesamt kritisch. Eine Wiederholung löst nichts, während die Zertifikate weiter ablaufen — bleibt es unbeachtet, kommt der Dienst zwangsläufig zum Stillstand.

`UNREACHABLE` und `SERVER_ERROR` sind dagegen teilweise. Mit den vorhandenen Zertifikaten läuft alles weiter, und im nächsten Zyklus erholt sich die Synchronisierung von selbst — **schlägt sie jedoch dauerhaft fehl, geht sie am Ende in „kritisch" über.** Setzen Sie den Alarm auf die Anzahl aufeinanderfolgender Fehlschläge.

::: tip Synchronisierungsfehler werden nicht als Ausnahme geworfen
Auch wenn die erste Synchronisierung fehlschlägt, wird der Manager normal zurückgegeben — es ist besser, wenn die Synchronisierung wenigstens verspätet gelingt. Der Fehlschlag bleibt stattdessen als **abfragbarer Zustand** erhalten.

| Client | Abfrage |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

Gab es noch keinen Erfolg, steht dort `DAT_CMS_NOT_SYNCED`; im Normalfall ist der Wert leer.
:::

---

## Server

Codes, die der CMS-Server erzeugt. Clients **erzeugen sie nicht, sondern empfangen sie nur**.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
Der Header <code>Authorization</code> fehlt, oder das Token ist auf keiner Stufe registriert.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
Das Token ist registriert, entspricht aber nicht der Stufe, die dieser Endpunkt verlangt.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="Token sofort konfigurieren">
Es ist kein einziges Token konfiguriert, deshalb ist die Authentifizierung vollständig deaktiviert. <strong>Damit steht sogar die API zur Zertifikatsausstellung ohne Authentifizierung offen.</strong> Erscheint nicht in der Antwort, sondern nur im Startprotokoll.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
Pfad- oder Query-Parameter sind nicht interpretierbar, oder ein Argument liegt außerhalb des zulässigen Bereichs (negatives delay, mehr als zehn Jahre usw.).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
Der Algorithmusname im Anfragepfad ist unbekannt.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
Diese Route existiert nicht oder die Methode weicht ab.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
Die Größe des Anfragekörpers wurde überschritten.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
Ein Anfragefehler, der sich keiner der obigen Kategorien zuordnen lässt.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="Nach Backoff erneut versuchen">
Abgerissene DB-Verbindung, erschöpfter Verbindungspool, Sperrenkonkurrenz, Timeout. <strong>Der einzige Code, der 503 verwendet</strong> — das Signal, an dem der Client erkennt: „Das wird durch Warten besser."
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="DB-Zustand prüfen">
Fehlgeschlagene Lese- oder Schreibvorgänge, fehlende Tabelle, Schemaabweichung, beschädigte Zertifikatszeile.
</ErrorCode>

Antwortumschlag:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

Fehler, die beim Erzeugen und Verarbeiten von Zertifikaten auftreten, verwendet auch der Server unverändert aus den obigen gemeinsamen Codes (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`).

### Wenn ein Servercode eintrifft

Der Client hüllt den Servercode in seinen eigenen `CMS`-Code und bewahrt das Original in `cause` auf.

| Empfangen | HTTP | Code des Clients |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (übrige) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (Versionsrückstufung) | 200 | `DAT_CMS_VERSION_RESET` |

---

## Nach Symptom suchen

| Symptom | Code |
| --- | --- |
| Direkt nach dem Login geht es, kurz darauf wird abgelehnt | `DAT_TOKEN_EXPIRED` — Die Lebensdauer des Tokens ist abgelaufen. Eine Neuausstellung genügt |
| Prüfung schlägt nur auf einem bestimmten Server fehl | `DAT_CERT_NOT_SYNCED` — Dieser Server hat die neue CID noch nicht erhalten |
| Dasselbe Token wird auf allen Servern abgelehnt | `DAT_CERT_NOT_FOUND` — Eine CID, die wir nie ausgestellt haben |
| Der ausstellende Server kann kein Token erzeugen | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **Es wurde verify-only ausgerollt** |
| Ausstellung schlägt nur direkt nach dem Start fehl | `DAT_MANAGER_NO_CERTIFICATE` — Vor der ersten Synchronisierung. Löst sich in Kürze |
| Die CMS-Synchronisierung schlägt dauerhaft fehl | `DAT_CMS_UNAUTHORIZED` — Das Token ist falsch. Eine Wiederholung löst nichts |
| Es kommt kein einziges Zertifikat an | `DAT_CMS_ENDPOINT_NOT_FOUND` — Ein Tippfehler in der URL |
| Nur auf einer bestimmten Plattform schlägt es fehl | `DAT_INTERNAL_UNAVAILABLE` — Das Krypto-Backend fehlt |
| Fehlgeschlagene Prüfungen nehmen plötzlich zu | `DAT_SIG_MISMATCH` — Einzeln harmlos, aber **gehäuft ein Fälschungsversuch** |
| Die secure-Entschlüsselung schlägt plötzlich fehl | `DAT_CRYPTO_TAG_MISMATCH` — Die Zertifikate passen nicht zusammen oder es ist ein **Manipulationsversuch** |
| Warnung im CMS-Startprotokoll | `DAT_AUTH_DISABLED` — **Die Authentifizierung ist aus.** Die Ausstellungs-API steht offen |

---

## Anhang

### Code-Syntax

```
DAT_<Bereich>_<Ursache>
```

- Tritt dieselbe Ursache in verschiedenen Bereichen auf, **lautet der Ursachenname gleich.** `DAT_TOKEN_MALFORMED` und `DAT_CERT_MALFORMED` unterscheiden sich nur im Gegenstand, die Bedeutung ist dieselbe.
- `_UNKNOWN` ist **ausschließlich der Fallback** des jeweiligen Bereichs. Es wird nicht in anderer Bedeutung verwendet, etwa für „unbekannter Algorithmus" (dafür steht `_UNSUPPORTED`).
- Die Code-Zeichenkette ist ein öffentlicher Vertrag. Die Meldung darf frei geändert werden, der Code nicht.

| Kategorie | Code-Präfix |
| --- | --- |
| Token | `DAT_TOKEN_` |
| Zertifikat | `DAT_CERT_` |
| Signatur | `DAT_SIG_` |
| Verschlüsselung | `DAT_CRYPTO_` |
| Schlüssel | `DAT_KEY_` |
| Manager | `DAT_MANAGER_` |
| Konfiguration | `DAT_CONFIG_` |
| Intern | `DAT_INTERNAL_` |
| CMS-Synchronisierung | `DAT_CMS_` |
| Server | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### Zugriff je Client

| Client | Fehlertyp | Code | Wiederholungsklasse | Sicherheitsereignis |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS-Server | JSON-Umschlag | Feld `code` | — | — |

`Sicherheitsereignis` liefert nur für die beiden Fälle `true`, bei denen Fälschung oder Manipulation feststeht (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`). Die Markierung **Verdacht** in diesem Dokument reicht weiter (bis hin zu manipulierten Tokens, Schlüsseln und Anfragen); sie ist derzeit nur eine Klassifikation der Dokumentation und wird nicht über die Client-API bereitgestellt.

Auch die Stufe **Auswirkung** ist eine Klassifikation der Dokumentation. Derselbe Code kann je nach Fundort unterschiedlich hart treffen — `DAT_KEY_INVALID` etwa hat keine Auswirkung, wenn damit ein eingehendes Token aussortiert wird, lässt aber die gesamte Synchronisierung scheitern, wenn er beim Lesen eines Zertifikats während der CMS-Synchronisierung auftritt.

**Untergeordnete Ursachen gehen nicht verloren.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` und `DAT_CMS_IMPORT_FAILED` reichen den Grund über die Ausnahmeverkettung der jeweiligen Sprache weiter (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning C/C++ behält auch die Ganzzahlwerte
Die bisherigen Ganzzahlwerte von `dat_error_t` bleiben aus Gründen der ABI-Kompatibilität erhalten, **maßgeblich ist jedoch der Textcode**. Die Bibliothek gibt die alten Werte nicht mehr zurück, deshalb trifft ein Vergleich wie `err == DAT_ERROR_INVALID_DAT` nicht mehr zu. Vergleichen Sie stattdessen über `dat_error_code(e)`.

C kennt keine Ausnahmeverkettung, deshalb wird der Grund separat über `dat_manager_issuable_cause()` abgefragt.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
