# DAT CMS

DAT CMS ist ein optionaler Dienst, der Zertifikate erstellt, speichert und an Client-Manager übermittelt. Dieses Dokument beschreibt den Synchronisierungsvertrag zwischen Client und Server. Installation und Betrieb erläutert der [Leitfaden zum DAT-CMS-Dienst](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Zertifikate synchronisieren"
  :actors="[
    {id: 'client', label: 'Client', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Aktuelle Version und Zertifikate anfordern', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Mit Version und Zertifikaten antworten', kind: 'res'},
    {from: 'client', label: 'Vollständig prüfen und atomar anwenden', kind: 'note'},
  ]"
/>

## Endpoints nach Rolle

| Rolle | Pfad | Verwendung |
| --- | --- | --- |
| Vollständige Zertifikate abrufen | `GET /v1/certs?version=<n>` | Dienste, die DAT ausstellen |
| Zertifikate nur zur Prüfung abrufen | `GET /v1/certs/verify-only?version=<n>` | Dienste, die nur prüfen und entschlüsseln |
| Zertifikat registrieren | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Betrieb oder Aufgabe zur Zertifikatserstellung |

Der vollständige Abruf und der Abruf nur zur Prüfung können durch verschiedene Tokenrollen geschützt werden. Setzen Sie im Client-Manager die Option `verifyOnly`, damit ein reiner Prüfdienst keine vollständigen Zertifikate anfordert.

## Versionscursor

Der Client übermittelt dem Server die zuletzt angewandte Version. Bei unverändertem Serverzustand müssen Zertifikate nicht erneut übertragen werden. Liegt ein neuer Zustand vor, enthält die erste Antwortzeile die Version und jede weitere Zeile ein Zertifikat.

Enthält eine erfolgreiche Antwort nur die Version und keine Zertifikate, bleiben vorhandene Zertifikate und der Aussteller erhalten. Eine Antwort mit einer niedrigeren Serverversion als der Clientversion wird als Fehler behandelt, ohne den Zustand zurückzusetzen.

## Regeln zum Anwenden von Zertifikaten

- Wiederholt sich dieselbe `cid` in einer Antwort, wird die gesamte Antwort abgelehnt.
- Entspricht eine `cid` der neuen Antwort einer bereits vorhandenen `cid`, bleibt das bestehende Zertifikat erhalten.
- Erst nach Parsing und Prüfung aller Zertifikate wird der Zustand in einem Schritt angewandt.
- Es bleibt kein Zustand zurück, in dem nur ein Teil der Zertifikate erfolgreich angewandt wurde.
- Als Aussteller wird ein geeignetes vollständiges Zertifikat aus den aktuell ausstellungsfähigen Zertifikaten gewählt.

## Initiale und manuelle Synchronisierung

Die erste Synchronisierung beim Erstellen des Client-Managers erfolgt meist best-effort. Auch bei einem Fehler wird der Manager erstellt und der letzte konkrete Fehler gespeichert. Muss der Anwendungsstart fehlschlagen, rufen Sie die API der jeweiligen Bibliothek zur sofortigen Synchronisierung auf und geben Sie den Fehler an den Aufrufer weiter.

Umgebungen ohne automatische Synchronisierung können das interval deaktivieren und bei Bedarf manuell synchronisieren. Bei automatischer Synchronisierung muss der Manager beim Beenden der Anwendung geschlossen oder gestoppt werden.

## Netzwerk und Fehler

Konfigurieren Sie Verbindungs- und Gesamt-Timeout passend zur Betriebsumgebung. Da die Weiterleitungsrichtlinie je nach runtime variiert, beachten Sie die Bibliotheksdokumentation. Nicht erfolgreiche CMS-Antworten werden derzeit anhand des HTTP-Status als `DAT_CMS_*`-Fehler klassifiziert. Der detaillierte Fehlercode aus dem Server-JSON bleibt nicht unverändert erhalten.

Bei einer vorübergehenden Störung des Speichers kann der Server den letzten erfolgreichen Snapshot der Zertifikate bereitstellen. Existiert noch kein erfolgreicher Snapshot, antwortet er mit `DAT_STORE_UNAVAILABLE`.

## Dienstdokumentation

Bereitstellung, Datenbank, Zugriffstokens und Laufzeitkonfiguration werden im [Leitfaden zum DAT-CMS-Dienst](../svc/docker-saro-lab-dat-cms) beschrieben.

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
