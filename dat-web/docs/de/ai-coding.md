# Vibe Coding mit AI

DAT lässt sich leichter einführen, wenn Sie der AI Ihr aktuelles Projekt und das gewünschte Verhalten beschreiben. Passen Sie in den folgenden Beispielen nur die Adresse und die Namen der Umgebungsvariablen an Ihr Projekt an.

## Einfache Implementierung

Verwenden Sie diese Anfrage, wenn Sie schnell eine Grundstruktur erstellen möchten.

```text
Ich verwende Kotlin und Spring Boot.
Füge DAT-Authentifizierung zu Spring Security hinzu.

Lies zuerst https://dat.saro.me/llms.txt und prüfe
die DAT-Spezifikation und die Verwendung der offiziellen Bibliothek.

Prüfe das Bearer token im Authorization-Header und
lege bei erfolgreicher Authentifizierung die Benutzerdaten im SecurityContext ab.

Dieser Server stellt keine DAT aus, sondern prüft sie nur.
Er muss von DAT CMS Zertifikate ausschließlich zur Prüfung abrufen.

Suche zuerst im Projekt nach der CMS-Serveradresse und der Tokenkonfiguration.
Falls du sie nicht findest, frage mich. Erfinde keine Werte.

Verwende die offizielle DAT-Bibliothek für Java/Kotlin und passe die Implementierung
an die vorhandene Projektstruktur und den bestehenden Codestil an.
```

## Detaillierte Implementierung

Verwenden Sie diese Anfrage, wenn Authentifizierung und Fehlerbehandlung genau festgelegt werden sollen.

```text
Dieses Projekt verwendet Kotlin, Spring Boot und Spring Security.
Prüfe die aktuelle Sicherheitskonfiguration und füge DAT-Authentifizierung hinzu.

Lies zuerst https://dat.saro.me/llms.txt und prüfe
die DAT-Spezifikation, das Verfahren zur Zertifikatssynchronisierung und die API der offiziellen Bibliothek.

Für die Implementierung gelten folgende Bedingungen.

- Lies DAT aus dem Header Authorization: Bearer.
- Wenn kein DAT vorhanden ist, führe die Anfrage anonym fort.
- Wenn DAT ungültig oder abgelaufen ist, antworte mit 401.
- Lege nach erfolgreicher Prüfung Benutzer-ID und Berechtigungen im SecurityContext ab.
- Lies aus plain nur Werte, die öffentlich sein dürfen.
- Lies Benutzer-ID und Berechtigungen aus den geprüften secure-Daten.
- Dieser Server prüft nur und verwendet deshalb verify-only-Zertifikate von DAT CMS.
- Beziehe CMS-Adresse und Token aus Umgebungsvariablen.
- Wenn die Zertifikatssynchronisierung beim Start fehlschlägt, muss auch der Anwendungsstart fehlschlagen.
- Aktualisiere Zertifikate während des Betriebs automatisch und schließe den Manager beim Beenden.
- Unterscheide Fehlerursachen anhand des DAT-Fehlercodes und nicht anhand der Fehlermeldung.
- Protokolliere weder den ursprünglichen DAT noch das CMS-Token oder personenbezogene Daten.

Prüfe zuerst die Spring-Security-Konfiguration sowie die Benutzer- und Berechtigungsstruktur des Projekts.
Wenn CMS-Adresse, Token-Umgebungsvariablen oder Format der secure-Daten nicht ermittelt werden können, frage vor der Implementierung nach.
Verwende ausschließlich die öffentliche API der offiziellen DAT-Bibliothek für Java/Kotlin.

Erläutere vor der Codeänderung kurz den Authentifizierungsablauf und die zu ändernden Dateien.
```

## Welches Beispiel eignet sich?

- Wenn Sie zunächst lauffähigen Code erstellen möchten, verwenden Sie **Einfache Implementierung**.
- Für einen Authentifizierungsablauf in einer Produktionsumgebung verwenden Sie **Detaillierte Implementierung**.

Wenn die AI nachfragt, nennen Sie zuerst die CMS-Adresse, den Namen der Umgebungsvariable für das Token und die in `secure` gespeicherten Benutzerdaten.
