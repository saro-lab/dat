# DAT-Zertifikat

## 1. Überblick

Das **DAT-Zertifikat** ist eine Spezifikation zur Steuerung der Ausstellungsberechtigung von DAT sowie zur Verwaltung der Signatur- und Verschlüsselungsalgorithmen und der Schlüssel (Key) des Tokens.

Jedes Zertifikat besitzt eine eindeutige ID (`CID`) und verwaltet den Token-Lebenszyklus sicher, indem es den Ausstellungszeitraum des DAT sowie die Gültigkeitsdauer (TTL) der erzeugten Tokens vorschreibt.

Bei DAT ist **Key-Rolling keine Option.** Da der Ausstellungszeitraum auf Spezifikationsebene im Zertifikat festgeschrieben ist, lassen sich nach Ablauf dieses Zeitraums mit dem Zertifikat keine neuen Tokens mehr erzeugen.

---

## 2. Zertifikatsstruktur

<WireFormat
    title="Wire-Format des Zertifikats"
    hint="Bewegen Sie den Mauszeiger über ein Feld, um dessen Beschreibung anzuzeigen."
    :segments="[
        {name: 'cid', type: 'uint64 (hexadezimal)', kind: 'meta', note: 'Eindeutige ID des Zertifikats. Wird mit dem Feld cid des DAT abgeglichen.'},
        {name: 'start', type: 'uint64 (dezimal)', kind: 'meta', note: 'Beginn der Ausstellung (Unixtime in Sekunden).'},
        {name: 'duration', type: 'uint64 (dezimal)', kind: 'meta', note: 'Ausstellungszeitraum (Sekunden). Eine Dauer, kein absoluter Zeitpunkt.'},
        {name: 'ttl', type: 'uint64 (dezimal)', kind: 'meta', note: 'Gültigkeitsdauer (Sekunden) der mit diesem Zertifikat ausgestellten DATs.'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: 'Name des Signaturalgorithmus.'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: 'Name des Verschlüsselungsalgorithmus.'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Signaturschlüssel. Beim verify-only-Export gibt ECDSA nur den öffentlichen Schlüssel heraus.'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Verschlüsselungsschlüssel. Da er symmetrisch ist, wird er unabhängig von verify-only stets vollständig herausgegeben.'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. Detailspezifikation der einzelnen Felder

`CID` : Hex (uint64)

* Eine eindeutige Zertifikats-ID zur Identifizierung des Zertifikats. Sie wird dem Feld `CID` des DAT zugeordnet und bestimmt, welches Zertifikat bei der Verifizierung verwendet wird.
* **Die CID ist ein unveränderlicher Bezeichner.** Beim Schlüsselwechsel wird dieselbe CID nicht wiederverwendet, sondern ein Zertifikat mit einer neuen CID ausgestellt.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Gibt den **Startzeitpunkt** in Sekunden (Seconds) an, ab dem mit diesem Zertifikat ein DAT ausgestellt werden kann.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* Die **Ausstellungs-Gültigkeitsdauer** des Zertifikats. Nach Ablauf dieser Dauer (in Sekunden) ab `{{t('dat_issue_start')}}` kann mit diesem Zertifikat kein neues DAT mehr ausgestellt werden.
* **Es handelt sich um eine Dauer (duration), nicht um einen absoluten Zeitpunkt.** Der Endzeitpunkt errechnet sich als `start + duration`.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* Die Gültigkeitsdauer (Time To Live) der mit diesem Zertifikat ausgestellten DATs. Bei der DAT-Erstellung wird der Wert `expire` gesetzt, indem dieser Wert zum Ausstellungszeitpunkt addiert wird.

`{{t('sig_alg')}}` : String / Enum

* Der **Signaturalgorithmus**, der zum Erstellen und Verifizieren des Feldes `signature` des DAT verwendet wird.

`{{t('crypto_alg')}}` : String / Enum

* Der **Verschlüsselungsalgorithmus**, der zum Ver- und Entschlüsseln des Feldes `secure` des DAT verwendet wird.

`{{t('sig_key')}}` : Base64Url (Binary)

* Schlüsseldaten, die für Signierung und Verifizierung verwendet werden. (Je nach Algorithmus kann dies der Public/Private Key eines asymmetrischen Schlüsselpaars oder ein symmetrischer Schlüssel sein.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Verschlüsselungsschlüsseldaten, die zur Ver- und Entschlüsselung des Feldes `secure` verwendet werden.

### 2.2. Zeitberechnung

```
end    = start + duration        Ende der Ausstellung
expire = end + ttl               endgültiger Ablauf des Zertifikats
```

* Alle Berechnungen erfolgen in uint64, und **nur ein Überlauf** wird als Fehler abgelehnt.
* `duration = 0` und `ttl = 0` sind **zulässige Werte**. Damit lassen sich ein Zertifikat, dessen Ausstellungsfenster sofort schließt, oder ein Zertifikat, dessen Tokens unmittelbar nach der Ausstellung ungültig werden, abbilden.
* Da alle Felder vorzeichenlose Ganzzahlen sind, **existieren negative Werte typbedingt nicht.**

### 2.3. Konstruktor-Signatur

Alle Sprachimplementierungen verwenden die folgende Argumentreihenfolge.

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning Das dritte Argument ist eine Dauer, kein Endzeitpunkt
Übergibt man dem dritten Argument einen absoluten Endzeitpunkt (end), entsteht ohne jede Fehlermeldung ein **Zertifikat mit einem völlig falschen Gültigkeitsfenster** — denn der Wert fließt unverändert in `start + duration` ein.
:::

---

## 3. Lebenszyklus des Zertifikats

<CertTimeline
    title="Die vier Abschnitte eines Zertifikats"
    caption="Ein Zertifikat läuft erst endgültig ab, nachdem es die Abschnitte Ausstellungsverzögerung → Ausstellung möglich → verbleibende DAT-TTL vollständig durchlaufen hat."
    :marks="['Erzeugung', 'Beginn der Ausstellung', 'Ende der Ausstellung', 'Endgültiger Ablauf']"
    :phases="[
        {label: 'Ausstellungsverzögerung (delay)', weight: 1.2, kind: 'delay', note: 'Zeit, damit alle Knoten das Zertifikat abholen'},
        {label: 'Ausstellung möglich (duration)', weight: 3, kind: 'issue', note: 'DAT-Ausstellung und -Verifizierung möglich'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Keine Ausstellung, nur Verifizierung'},
    ]"
/>

| Abschnitt | Ausstellung | Verifizierung | Kriterium |
| --- | --- | --- | --- |
| Ausstellungsverzögerung | ✕ | ○ | `issuable() == false` |
| Ausstellung möglich | ○ | ○ | `issuable() == true` |
| Verbleibende DAT-TTL | ✕ | ○ | Ausstellungsfenster geschlossen, aber noch nicht abgelaufen |
| Nach endgültigem Ablauf | ✕ | ✕ | `expired() == true` |

* **Die Ausstellungsfähigkeit** wird über `signable() && start <= now <= end` bestimmt und **schließt beide Enden ein**.
* Auch nachdem das Ausstellungsfenster geschlossen ist, lebt das Zertifikat noch um `ttl` weiter. Ein kurz vor Schließung des Fensters ausgestelltes Token muss seine volle Lebensdauer ausschöpfen können.
* Der Abschnitt **Ausstellungsverzögerung (delay)** verschafft allen Knoten des Clusters Zeit, das neue Zertifikat abzuholen. Einzelheiten finden Sie im Dokument [{{t('menu_spec_cms')}}](./cms).

---

## 4. Algorithmen

### 4.1. Signaturalgorithmen

Liste der Signaturalgorithmen zum Schutz des DAT vor Fälschung und Manipulation. Unterstützt werden symmetrische und asymmetrische Schlüsselverfahren.

| Name | Verfahren | Anmerkung |
| --- | --- | --- |
| `ECDSA-P256` | Asymmetrisch | Elliptische-Kurven-Digitalsignatur (NIST secp256r1) |
| `ECDSA-P384` | Asymmetrisch | Elliptische-Kurven-Digitalsignatur (NIST secp384r1) |
| `ECDSA-P521` | Asymmetrisch | Elliptische-Kurven-Digitalsignatur (NIST secp521r1) |
| `HMAC-SHA256-MFS` | Symmetrisch | Keyed-Hashing auf Basis eines 256-Bit-Geheimschlüssels fester Größe |
| `HMAC-SHA384-MFS` | Symmetrisch | Keyed-Hashing auf Basis eines 384-Bit-Geheimschlüssels fester Größe |
| `HMAC-SHA512-MFS` | Symmetrisch | Keyed-Hashing auf Basis eines 512-Bit-Geheimschlüssels fester Größe |

> **MFS (Maximum Fixed Secret):** Ein Verfahren, bei dem ein Geheimschlüssel fester Größe verwendet wird, dessen Bitlänge der Ausgabe (Output) des Hash-Algorithmus entspricht.

### 4.2. Verschlüsselungsalgorithmen

Liste der authentifizierten Verschlüsselungsalgorithmen (Authenticated Encryption) zum Schutz der vertraulichen Daten im DAT (Feld `secure`).

| Name | Schlüssellänge | Aufbau |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-Bit | IV(96bit) + Verschlüsselungsergebnis |
| `IV-AES256-GCM` | 256-Bit | IV(96bit) + Verschlüsselungsergebnis |

> **IV (Initialization Vector) Einbettung:** Bei jeder Verschlüsselung wird ein eindeutiger 96-Bit-NONCE (IV) erzeugt und dem Verschlüsselungsergebnis als Präfix (Prefix) vorangestellt. Bei der Entschlüsselung werden die ersten 96 Bit als IV abgetrennt und zur Entschlüsselung verwendet.

### 4.3. Prüfung der Schlüssellänge

Beim Einlesen eines Zertifikats wird geprüft, **ob die Bitlänge des deklarierten Algorithmus mit der tatsächlichen Schlüssellänge übereinstimmt**.

Enthält beispielsweise ein Zertifikat, das `IV-AES256-GCM` deklariert, einen 16-Byte-Schlüssel, so wird bereits der Import selbst abgelehnt. Ohne diese Prüfung würde man im Glauben, AES-256 zu verwenden, tatsächlich mit AES-128 arbeiten.

---

## 5. Verify-only-Export

Servern, die ausschließlich verifizieren, muss man den privaten Signaturschlüssel nicht geben. Das DAT-Zertifikat bietet dafür den **verify-only-Export**.

<FlowDiagram
    title="Verteilungswege des vollständigen und des verify-only-Zertifikats"
    :legend="{req: 'Anfrage', res: 'Antwort', sync: 'Zertifikatsverteilung'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Ausstellungsserver', kind: 'issuer'},
        {id: 'verifier', label: 'Reiner Verifizierungsserver', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: 'Vollständiges Zertifikat (inkl. privatem Signaturschlüssel)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'verify-only-Zertifikat', kind: 'sync'},
    ]"
/>

| Signaturalgorithmus | `support_verify_only()` | Ergebnis des verify-only-Exports |
| --- | --- | --- |
| **ECDSA**-Familie | `true` | Vom Signaturschlüssel wird **nur der öffentliche Schlüssel** herausgegeben (Base64 130 Zeichen → 87 Zeichen) |
| **HMAC**-Familie | `false` | Es tritt ein **expliziter Fehler** auf |

HMAC ist symmetrisch, daher existiert so etwas wie ein „nur zur Verifizierung geeigneter Schlüssel" gar nicht. Ein Versuch, verify-only zu exportieren, wird deshalb nicht stillschweigend übersprungen, sondern **sofort als Fehler gemeldet.** Da ein verify-only-Export fehlschlägt, sobald HMAC-Zertifikate darunter gemischt sind, sollten Sie die ECDSA-Familie verwenden, wenn Sie reine Verifizierungsknoten betreiben.

::: danger Der Verschlüsselungsschlüssel wird auch bei verify-only vollständig herausgegeben
Der AES-Schlüssel für das Feld `secure` ist **symmetrisch** und wird daher unabhängig von verify-only **immer vollständig exportiert**, denn zum Entschlüsseln wird derselbe Schlüssel benötigt wie zum Verschlüsseln.

Ein Server, der ein verify-only-Zertifikat erhalten hat, kann also:

* **keine Signatur fälschen** — ohne privaten Schlüssel kann er kein neues DAT erzeugen.
* **die `secure`-Nutzlast entschlüsseln** — ihm gegenüber besteht keine Vertraulichkeit.

verify-only ist ein Mittel zur Aufteilung der *Ausstellungsberechtigung*, nicht zur Aufteilung der *Vertraulichkeit*. Werte, die vor Verifizierungsknoten verborgen bleiben müssen, dürfen nicht in `secure` abgelegt werden.
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
