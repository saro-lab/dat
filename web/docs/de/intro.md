# DAT (Distributed Access Token)

---

## Hintergrund der DAT-Einführung

Heute adoptieren viele Systeme JWT, aber in tatsächlichen Produktionsumgebungen bestehen folgende strukturelle Einschränkungen.<br/>
Um diese Probleme zu lösen, wurde die neue Token-Spezifikation DAT entwickelt.

#### 🧩 Fragmentierung der Sicherheitsspezifikationen und mangelnde Durchsetzung
JWT bietet Verschlüsselungsstandards wie JWE an, deren Verwendung jedoch nicht erzwungen wird.<br/>
Infolgedessen lassen viele Entwicklungsumgebungen die Verschlüsselung weg oder übertragen Daten mit nicht standardisierten Methoden, was zu Sicherheitslücken führt.

#### 🔑 Sicherheitsrisiken durch statische Schlüsselverwendung
Da das Rotieren von Signaturschlüsseln nicht obligatorisch ist, werden einzelne Schlüssel häufig über lange Zeiträume verwendet. Dies kann bei einer Schlüsselkompromittierung zum vollständigen Sicherheitskollaps des Systems führen; tatsächlich sind auf großen E-Commerce-Websites Sicherheitsvorfälle durch dieses Problem aufgetreten.

#### 📉 Leistungsverschlechterung durch Overhead
JWT durchläuft bei jeder Anfrage einen JSON-Parsing-Prozess, der erhebliche CPU-Ressourcen verbraucht. In hochleistungsorientierten Umgebungen kann diese Parsing-Kosten zum Hauptengpass des gesamten Systems werden.


## Kernphilosophie von DAT

DAT wurde nach den Grundsätzen entwickelt, dass Sicherheit obligatorisch und kein optionales Feature ist, und dass Leistung nicht kompromittiert werden kann.

#### ⚡ Leicht und schnell

```expire```.```cid```.```plain```.```secure```.```signature```

DAT verfügt über eine leichtgewichtige Datenstruktur wie oben gezeigt.

#### 🔐 Erzwungene Sicherheit

DAT trennt bei der Datenübertragung physisch den Klartextbereich (Plain) vom **verschlüsselten (Secure)** Bereich.<br/>
Es wird erzwungen, dass sensible Informationen verschlüsselt werden, und der gesamte Prozess wird durch `DatKey` mit standardisierten Algorithmen (P256, AES-GCM usw.) geschützt.

#### 🔄 Erzwungenes Key-Rolling

`DatKey`, das Herzstück des DAT-Systems, verwaltet direkt **den Schlüssel-Lebenszyklus** sowie die Token-Ausgabe und den Ablauf.<br/>
Es ist darauf ausgelegt, Schlüssel auf Systemebene regelmäßig zu rotieren, und verhindert grundlegend „statische Schlüssel-Sicherheitsvorfälle" durch Administratorunachtsamkeit.

---

## Vergleich der Authentifizierungsmechanismen

| Klassifizierung | **DAT** | **JWT** | **Session** |
| --- |-------------------------------| --- |---------------------------|
| **Authentifizierungsmethode** | **Verteilte Verifizierung** | Verteilte Verifizierung | Zentralisiert          |
| **Datenstruktur** | **Raw Bytes<br/>(Fester Offset-basiert)** | JSON<br/>(Schlüssel-Wert Textbasiert) | Serialized Object<br/>(Objekt-Serialisierung) |
| **Parse-Mechanismus** | **Sofortige Byte-Datenzuordnung** | Erfordert JSON-Parsing und Typumwandlung | Erfordert Objekt-Deserialisierung und I/O          |
| **Verarbeitungsleistung** | **Höchste (Minimaler Parse-Overhead)** | Moderat (Abhängig von JSON-Verarbeitungsleistung) | Niedrig (Netzwerk/Festplatten-I/O)         |
| **Verschlüsselung** | **Standardmäßig integriert** | Erfordert separate JWE-Implementierung (Komplex) | Nicht anwendbar                     |
| **Schlüsselverwaltung** | **Erzwungenes System-Rolling (Erzwungene Sicherheit)** | Erfordert direkte Implementierung (Risiko nachlässiger Verwaltung) | Nicht anwendbar                     |
| **Schlüsselgültigkeitsdauer** | **Erzwungen und explizit in der Schlüsselspezifikation** | Optional (Dauerhaft bei fehlender Verwaltung) | Vom zentralen Server verwaltet                  |
