# Leitfaden für KI-Coding

## Beispiel für Vibe-Coding

```
Wende DAT auf die Sitzungsauthentifizierung dieses Webservers an.
Es ist ein verteilter Access Token wie JWT, die Dokumentation findest du unter https://dat.saro.me/llms.txt
Lies sie zuerst. Lade den gesamten llms-Dokumentensatz herunter, lege ihn im Ordner docs/dat ab und aktualisiere auch die Agentendokumentation.

- Projekt: Java Spring Boot, verwendet Spring Security
- Ziel: die Sitzung durch DAT ersetzen
- DAT-CMS-Server: http://localhost:8088 - in die Properties auslagern
- Signaturalgorithmus: HMAC-SHA512-MFS
- Verschlüsselungsalgorithmus: IV-AES256-GCM
- Für alles Übrige die Standardwerte

Erfinde keine APIs, die nicht in der Dokumentation stehen.
```


## Algorithmen

### Signatur

| Algorithmus | Merkmale |
| --- |---|
| `HMAC-SHA256-MFS`<br/>`HMAC-SHA384-MFS`<br/>`HMAC-SHA512-MFS` | · hashbasiert<br/>· symmetrischer Schlüssel<br/>· hohe Geschwindigkeit<br/>· [HMAC](https://en.wikipedia.org/wiki/HMAC) |
| `ECDSA-P256`<br/>`ECDSA-P384`<br/>`ECDSA-P521` | · auf elliptischen Kurven basierend<br/>· asymmetrischer Schlüssel<br/>· Sicherheit, die mit Geschwindigkeit erkauft wird<br/>· [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) |

- HMAC ist **überwältigend schneller**. Kommt es allein darauf an, Angreifer von außen abzuwehren, ist HMAC die richtige Wahl.
  - [Benchmarks nach Algorithmus und Sprache ansehen](./intro#performance)
- ECDSA erlaubt es dank seiner Public-Key-Struktur, den ausstellenden Server und die Verifizierungsserver voneinander zu trennen. In einem großen System, in dem Berechtigungen und Rollen bereits getrennt sind, stärkt das die Sicherheit gegenüber Angriffen von innen.

### Verschlüsselung

| Name | Schlüssellänge |
| --- |---|
| `IV-AES128-GCM` | 128 Bit |
| `IV-AES256-GCM` | 256 Bit |

- Die von DAT verschlüsselten Daten sind kurz, daher besteht zwischen 128 Bit und 256 Bit praktisch kein messbarer Unterschied.
- AES kostet so gut wie keine Ressourcen, deshalb wird 256 Bit für die zusätzliche Sicherheitsreserve empfohlen.


## DAT-CMS-Server

**[DAT-CMS installieren](./svc/docker-saro-lab-dat-cms)**

DAT-CMS ist nicht zwingend erforderlich, die Installation wird jedoch dringend empfohlen, wenn Sie Zertifikate auf mehrere Server verteilen und das Key-Rolling automatisieren möchten.

## Weiterführende Dokumente

- [Was ist DAT?](./intro) - Hintergrund des Entwurfs von DAT
- [DAT-Spezifikation](./spec/dat) - Wire-Format des Tokens
- [Alle Bibliotheken](./libs/) - Installation und Beispiele je Sprache
