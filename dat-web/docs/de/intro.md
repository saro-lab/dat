
# DAT (Distributed Access Token)

---

## Hintergrund der Einführung von DAT

Heute setzen viele Systeme auf JWT, doch im realen Produktionsbetrieb bestehen die folgenden strukturellen Grenzen.<br/>
Um diese zu überwinden, wurde die neue Token-Spezifikation DAT entworfen.

#### 🧩 Fragmentierung der Sicherheitsspezifikation und fehlende Durchsetzung
JWT bietet zwar Verschlüsselungsstandards wie JWE an, deren Verwendung wird jedoch nicht erzwungen. <br/>
Dadurch verzichten viele Entwicklungsumgebungen auf die Verschlüsselung oder übertragen Daten auf nicht standardisierte Weise, was Sicherheitslücken verursacht.

#### 🔑 Sicherheitsrisiko durch statische Schlüssel (Static Key)
Da die Rotation von Signaturschlüsseln (Key-Rolling) nicht verpflichtend ist, wird ein einzelner Schlüssel häufig über lange Zeiträume verwendet. Bei einer Kompromittierung des Schlüssels kann dies zum Zusammenbruch der Sicherheit des gesamten Systems führen; tatsächlich sind auf großen Commerce-Sites bereits Sicherheitsvorfälle dieser Art aufgetreten.

#### 📉 Leistungseinbußen durch Overhead
JWT durchläuft bei jeder Anfrage einen JSON-Parsing-Vorgang und verbraucht dabei erhebliche CPU-Ressourcen. In Umgebungen mit hohen Leistungsanforderungen können diese Parsing-Kosten zum Engpass des gesamten Systems werden.

---

## Kernphilosophie von DAT

DAT wurde nach dem Grundsatz entworfen, dass Sicherheit nicht optional, sondern erzwungen sein muss und dass bei der Leistung keine Kompromisse eingegangen werden dürfen.

#### ⚡ Leicht und schnell

<WireFormat
    hint="Bewegen Sie den Mauszeiger über ein Feld, um dessen Beschreibung anzuzeigen."
    :segments="[
        {name: 'expire', type: 'uint64 (dezimal)', kind: 'meta', note: 'Ablaufzeit. Von der Spezifikation erzwungen und daher nicht weglassbar.'},
        {name: 'cid', type: 'uint64 (hexadezimal)', kind: 'meta', note: 'ID des Zertifikats, das zur Verifizierung verwendet wird.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Daten, die dem Client offengelegt werden.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Verschlüsselte Daten. Ohne Zertifikat nicht lesbar.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signatur über die vier vorangehenden Felder.'},
    ]"
/>

Wie oben dargestellt, besitzt DAT genau fünf feste, durch Punkte (`.`) getrennte Felder. Da die Position jedes Feldes durch die Spezifikation festgelegt ist, lassen sich die einzelnen Werte ohne JSON-Parsing allein anhand der Trennzeichen herausschneiden.

#### 🔐 Erzwungene Sicherheit

DAT trennt bei der Datenübertragung den Klartextbereich (Plain) und den **verschlüsselten Bereich (Secure)** physisch voneinander.<br/>
Sensible Informationen müssen zwingend verschlüsselt werden, und der gesamte Vorgang wird durch die im Zertifikat deklarierten Standardalgorithmen (ECDSA, AES-GCM usw.) geschützt.

Über den Verschlüsselungsalgorithmus entscheidet **das Zertifikat**, nicht das Token. Da das Token keinerlei Algorithmusinformationen enthält, existiert die Angriffsfläche für Algorithmusverwechslungsangriffe, wie sie der `alg`-Header von JWT eröffnet, hier gar nicht.

#### 🔄 Erzwungenes Key-Rolling

DAT-Zertifikate verwalten nicht nur Ausstellung und Ablauf von Tokens, sondern unmittelbar auch den **Lebenszyklus der Schlüssel**.<br/>
Im Zertifikat ist auf Spezifikationsebene festgeschrieben, „von wann bis wann ausgestellt werden darf". Nach Ablauf dieses Zeitraums lassen sich mit dem Zertifikat keine neuen Tokens mehr erzeugen. Die Situation, dass aus Unachtsamkeit des Administrators ein einzelner Schlüssel jahrelang verwendet wird, kann strukturell nicht eintreten.

#### ⏱️ Trennung von Ausstellungsfenster und Gültigkeitsdauer

„Der Zeitraum, in dem ein Zertifikat Tokens ausstellen darf" und „der Zeitraum, in dem ein ausgestelltes Token gültig bleibt" sind zwei verschiedene Werte.<br/>
Dadurch können bereits ausgegebene Tokens ihre volle Lebensdauer ausschöpfen, auch nachdem das Zertifikat die Ausstellung eingestellt hat, während der Cluster in der Zwischenzeit reibungslos auf das nächste Zertifikat übergeht.

---

## Vergleich der Authentifizierungsmechanismen

| Kriterium | **DAT**                       | **JWT** | **Session**           |
| --- |-------------------------------| --- |---------------------------|
| **Authentifizierungsmethode** | **Verteilte Verifizierung**                     | Verteilte Verifizierung | Zentralisiert          |
| **Datenstruktur** | **Raw Bytes<br/>(auf festen Offsets basierend)** | JSON<br/>(Key-Value, textbasiert) | Serialized Object<br/>(Objektserialisierung) |
| **Parsing-Mechanismus** | **Direkte Zuordnung der Byte-Daten**            | JSON-Parsing und Typumwandlung erforderlich | Objekt-Deserialisierung und I/O erforderlich          |
| **Verarbeitungsleistung** | **Höchste (minimaler Parsing-Overhead)**          | Mittel (abhängig von der JSON-Verarbeitungsleistung) | Niedrig (Netzwerk-/Festplatten-I/O)         |
| **Verschlüsselung** | **Standardmäßig enthalten**                     | JWE muss separat implementiert werden (komplex) | Nicht anwendbar                     |
| **Schlüsselverwaltung** | **Systemseitig erzwungenes Rolling (erzwungene Sicherheit)**         | Eigene Implementierung (Risiko nachlässiger Verwaltung) | Nicht anwendbar                     |
| **Schlüsselgültigkeitsdauer** | **In der Schlüsselspezifikation zwingend angegeben**              | Optional (ohne Verwaltung dauerhaft) | Vom zentralen Server verwaltet                  |
| **Algorithmuswahl** | **Vom Zertifikat bestimmt (nicht im Token)**          | `alg` im Token-Header | Nicht anwendbar                     |
| **Ablaufzeit** | **Laut Spezifikation Pflichtfeld**                 | Optionaler Claim (`exp`) | Vom Server verwaltet                   |

---

## Weiterführende Dokumente

- [{{t('menu_spec_dat')}}](./spec/dat) — Wire-Format des Tokens und kanonische Regeln
- [{{t('menu_spec_cert')}}](./spec/dat-certificate) — Zertifikatsstruktur, Algorithmen, Lebenszyklus
- [{{t('menu_spec_cms')}}](./spec/cms) — Zertifikatsverteilung und im Betrieb zu beachtendes Verhalten

<script setup lang="ts">
import {useTranslate} from "../.vitepress/src/langs";
import WireFormat from "../.vitepress/ui/WireFormat.vue";
const {t} = useTranslate();
</script>
