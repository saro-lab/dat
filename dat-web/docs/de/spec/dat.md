# DAT (Distributed Access Token)

## 1. Überblick

Mit steigender Anzahl gleichzeitiger Benutzer wächst auch die Anzahl der Sitzungen (Sessions), wodurch der Sitzungsserver übermäßig belastet wird.

**DAT** ist eine Token-Spezifikation, die entwickelt wurde, um dieses Lastproblem des Sitzungsservers zu lösen und eine effiziente, zustandslose (Stateless) Authentifizierung ohne gemeinsamen Zustand zwischen den Servern zu ermöglichen.

DAT ist eine Zeichenkette aus **fünf festen Feldern**, die durch Punkte (`.`) getrennt sind. Die einzelnen Felder lassen sich ohne JSON-Parsing allein anhand der Position der Trennzeichen herausschneiden, und die Ablaufzeit sowie der verschlüsselte Bereich sind bereits Bestandteil der Spezifikation selbst.

---

## 2. Wire-Format

<WireFormat
    title="DAT Wire-Format"
    hint="Bewegen Sie den Mauszeiger über ein Feld, um dessen Beschreibung anzuzeigen."
    :segments="[
        {name: 'expire', type: 'uint64 (dezimal)', kind: 'meta', note: 'Ablaufzeit des Tokens. Eine dezimale Ganzzahl in Unixtime-Sekunden.'},
        {name: 'cid', type: 'uint64 (hexadezimal)', kind: 'meta', note: 'ID des zur Verifizierung verwendeten Zertifikats. Notation in hexadezimalen Kleinbuchstaben.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Daten, die dem Client offengelegt werden. Jeder kann sie dekodieren.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Verschlüsselte Daten. Aufbau: IV (96 Bit) + AES-GCM-Chiffrat; ist nichts vorhanden, eine leere Zeichenkette.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signatur über alle vier vorangehenden Felder. Dieses Feld verhindert Fälschung und Manipulation.'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| Feld | Typ | Kodierung | Anmerkung |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | Dezimale Zeichenkette | Unixtime (Sekunden) |
| `CID` | uint64 | Hexadezimale Zeichenkette | Zertifikats-ID |
| `{{t('dat_plain')}}` | Binary | Base64Url (ohne Padding) | Öffentliche Daten |
| `{{t('dat_secure')}}` | Binary | Base64Url (ohne Padding) | Verschlüsselte Daten |
| `{{t('sig')}}` | Binary | Base64Url (ohne Padding) | Signatur |

<Struct type="dat" />

### 2.1. Detailspezifikation der einzelnen Felder

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Gibt die Ablaufzeit des Tokens als vorzeichenlose 64-Bit-Ganzzahl in Sekunden (Seconds) an.
- Es sind **ausschließlich reine Dezimalziffern zulässig**. Vorzeichen, Leerzeichen oder Trennzeichen führen zu einem Formatfehler.

`CID` : Hex (uint64)
- Die Zertifikats-ID (Certificate ID), die zur Verifizierung des Tokens verwendet wird.
- Es sind **ausschließlich reine Hexadezimalziffern zulässig**; das Präfix `0x` wird nicht verwendet.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Enthält Daten, die dem Client offengelegt werden. Neben Zeichenketten werden auch Binärdaten unterstützt, die vom Client dekodiert und eingesehen werden können.
- **Diese Daten werden nicht verschlüsselt.** Sensible Werte dürfen hier nicht abgelegt werden.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Enthält Daten, die vor dem Client verborgen bleiben. Sie sind mit dem Verschlüsselungsalgorithmus des Zertifikats verschlüsselt, sodass ein Client ohne Zertifikat den Inhalt nicht entschlüsseln kann.
- Der innere Aufbau ist `IV(96bit) + Chiffrat`, wobei der IV bei jeder Verschlüsselung neu erzeugt wird.

`{{t('sig')}}` : Base64Url (Binary)
- Signaturdaten zur Überprüfung des Tokens auf Fälschung und Manipulation. Sie werden erzeugt, indem die vorangehenden Felder mit dem Signaturalgorithmus des Zertifikats signiert werden.
- Bei einem Token, dessen Signaturprüfung fehlschlägt, darf keinem einzigen Feld vertraut werden.

---

## 3. Kanonische Regeln (Canonical Rules)

Damit in verschiedenen Sprachen implementierte Clients **dasselbe Token identisch interpretieren**, dürfen die folgenden Regeln zwischen den Implementierungen nicht voneinander abweichen. Die Referenzimplementierung ist Rust (`dat-rust`); alle übrigen Implementierungen richten sich nach diesen Regeln.

### 3.1. Parsen numerischer Felder

`expire` und `cid` werden **strikt** interpretiert. Die folgenden Eingaben werden allesamt als Formatfehler abgelehnt.

| Eingabebeispiel | Ergebnis | Grund |
| --- | --- | --- |
| `100` | Akzeptiert | Reines Dezimal |
| `007` | Akzeptiert | Führende Nullen sind erlaubt |
| `+100` | Abgelehnt | Vorzeichen nicht zulässig |
| `-1` | Abgelehnt | Vorzeichen nicht zulässig |
| `" 100 "` | Abgelehnt | Leerzeichen nicht zulässig |
| `1_0` | Abgelehnt | Trennzeichen nicht zulässig |
| `0x10` | Abgelehnt | Präfix nicht zulässig |
| `zzzz` | Abgelehnt | Keine Ziffer |
| `""` | Abgelehnt | Leere Zeichenkette |
| `18446744073709551616` | Abgelehnt | Überschreitet den uint64-Bereich |

::: warning Warum die Strenge notwendig ist
Ein nachsichtiger Parser wandelt `-1` in den Maximalwert von uint64 um und erzeugt damit ein **praktisch nie ablaufendes Token**, oder er ersetzt nicht numerische Werte stillschweigend durch `0`. Unterscheidet sich der Grad der Nachsicht zwischen den Implementierungen, wird dasselbe Token auf der einen Seite akzeptiert und auf der anderen abgelehnt — die Interoperabilität bricht.
:::

### 3.2. Ablaufprüfung

**DAT-Token und Zertifikat haben unterschiedliche Ablaufgrenzen.** Verwechseln Sie diese nicht.

| Gegenstand | Gültigkeitsbedingung | Exakt zur Ablaufzeit (`expire == now`) |
| --- | --- | --- |
| **DAT-Token** | `expire > now` | **Als abgelaufen abgelehnt** |
| **Zertifikat** | `expire >= now` | **Noch gültig** |

Ein Token wird in dem Moment ungültig, in dem seine Ablaufzeit erreicht ist; ein Zertifikat bleibt bis zu diesem Zeitpunkt gültig. Das Zertifikat muss einen Tick länger leben als das Token, damit ein an der Grenze ausgestelltes Token noch verifiziert werden kann.

### 3.3. Leere secure-Nutzlast

Sind keine zu verschlüsselnden Daten vorhanden, ist `secure` eine **leere Zeichenkette**.

- `encrypt(leere Eingabe)` → leere Ausgabe (weder IV noch GCM-Tag werden angehängt)
- `decrypt(leere Eingabe)` → leere Ausgabe
- Ist der Wert nicht leer, aber kürzer oder gleich der IV-Länge (12 Bytes), liegt ein **Entschlüsselungsfehler** vor.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ ein gültiges Token, bei dem die secure-Position leer ist
```

---

## 4. Ausstellung und Verifizierung

<FlowDiagram
    title="DAT: Ausstellung → Übergabe → Verifizierung"
    :legend="{req: 'Anfrage', res: 'Antwort', sync: 'Zertifikatssynchronisierung'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Ausstellungsserver', kind: 'issuer'},
        {id: 'client', label: 'Client', kind: 'client'},
        {id: 'verifier', label: 'Verifizierungsserver', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: 'Zertifikat verteilen', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: 'Zertifikat verteilen', kind: 'sync'},
        {from: 'client', to: 'issuer', label: 'Anmeldung', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'DAT ausstellen', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'Anfrage mit DAT', kind: 'req'},
        {from: 'verifier', label: 'Zertifikat per CID suchen → Signatur prüfen → entschlüsseln', kind: 'note'},
        {from: 'verifier', to: 'client', label: 'Antwort', kind: 'res'},
    ]"
/>

### 4.1. Ausstellungsablauf

1. Aus den Zertifikaten, die der Manager besitzt, wird ein **ausstellungsfähiges (issuable)** Zertifikat ausgewählt.
2. `expire = now + dat_ttl_seconds` wird berechnet.
3. `plain` wird nach Base64Url kodiert; `secure` wird verschlüsselt und anschließend nach Base64Url kodiert.
4. Die Zeichenkette `expire.cid.plain.secure` wird signiert und die Signatur als letztes Feld angehängt.

### 4.2. Verifizierungsablauf

1. Die Zeichenkette wird an den Punkten (`.`) in fünf Felder zerlegt. Weicht die Feldanzahl ab, liegt ein Formatfehler vor.
2. `expire` wird geprüft. Abgelaufene Tokens werden bereits vor der Signaturprüfung abgelehnt.
3. Über `cid` wird das Zertifikat gesucht. Ist es nicht vorhanden, ist keine Verifizierung möglich.
4. Die Signatur wird über den Abschnitt `expire.cid.plain.secure` verifiziert.
5. Erst nach erfolgreicher Verifizierung wird `secure` entschlüsselt.

::: danger Vertrauen Sie keinem Wert vor der Signaturprüfung
Manche Implementierungen bieten eine API an, die Felder ausliest, ohne die Signatur zu prüfen (Familie `parse without verify`). Diese Werte sind **vollständig durch einen Angreifer manipulierbar** und dürfen ausschließlich zu Logging- und Debugging-Zwecken verwendet werden.
:::

---

## 5. Vergleich mit JWT

DAT und JWT (JSON Web Token) teilen die durch Punkte (`.`) getrennte Tokenstruktur sowie die Verifizierung mittels Signatur, unterscheiden sich im internen Design jedoch in den folgenden wesentlichen Punkten.

### 5.1. Vergleich der strukturellen Unterschiede

* **JWT-Struktur**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT-Struktur**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. Wesentliche Unterschiede

* **Binärbasierte Kompaktheit:** JWT verarbeitet Header und Body als JSON-Zeichenketten, während DAT **Binärdaten (Binary) direkt verarbeitet** und dadurch die Datengröße optimiert sowie die Parsing-Effizienz erhöht.
* **Integrierte Sicherheit (Feld `{{t('dat_secure')}}`):** Bei JWT ist der Payload standardmäßig im Klartext sichtbar; soll er verschlüsselt werden, muss eine separate Spezifikation wie JWE angewendet werden. DAT hingegen **unterstützt Verschlüsselung nativ über das Feld `{{t('dat_secure')}}`** direkt im Token.
* **Erzwungene Ablaufzeitbeschränkung:** In JWT ist das Feld `exp` (Claims) optional, während in DAT das **Feld `{{t('dat_expire')}}` strukturell verpflichtend** ist, sodass die Gültigkeitsprüfung zwingend durchgeführt wird.
* **Keine Algorithmusaushandlung:** Da JWT den Wert `alg` im Header im Token selbst mitführt, entsteht eine Angriffsfläche für Algorithmusverwechslungsangriffe. Bei DAT bestimmt **das Zertifikat** den Algorithmus, und das Token enthält keinerlei Algorithmusinformationen.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
