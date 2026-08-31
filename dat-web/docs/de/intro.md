# Was ist DAT?

DAT (Distributed Access Token) ist eine Spezifikation für Zugriffstokens, bei der ein ausstellender Dienst und ein Prüfdienst dasselbe Zertifikat gemeinsam verwenden. Da die Prüfung keine erneute Anfrage beim Aussteller oder einem zentralen Sitzungsspeicher erfordert, lassen sich Authentifizierungsergebnisse mit geringerer Kopplung zwischen Diensten übertragen.

<WireFormat
  hint="Durch Punkte getrennte Felder bilden gemeinsam einen DAT."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Unix time des Ablaufs'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Zertifikat-ID'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Öffentliche Daten'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Verschlüsselte Daten'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Signatur des Inhalts'},
  ]"
/>

## Bestandteile

### DAT

Eine Zeichenfolge, die ein Benutzer oder Dienst mit einer Anfrage übermittelt. Sie enthält Ablaufzeitpunkt und Zertifikat-ID und kann zugleich öffentliche und verschlüsselte Daten transportieren.

### Zertifikat

Es enthält Algorithmen, Schlüssel und Zeiträume zum Erstellen und Prüfen eines DAT. Die Zertifikat-ID `cid` bleibt unverändert. Bei einem Schlüsselwechsel wird eine neue `cid` verwendet.

### Manager

Der Manager der Clientbibliothek speichert Zertifikate, erstellt DAT mit einem aktuell ausstellungsfähigen Zertifikat und prüft DAT mit dem zu ihrer `cid` passenden Zertifikat.

### DAT CMS

Ein optionaler Server, der Zertifikate erstellt, speichert und an Dienste übermittelt. Ausstellende Dienste können vollständige Zertifikate erhalten, Dienste mit reiner Prüffunktion nur zur Prüfung bestimmte Zertifikate.

## Ausstellung und Prüfung

<ArchFlow
  :user="{label: 'Benutzer', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Zertifikate verwalten', 'Versionsbasierte Synchronisierung']}"
  :service="{servers: [
    {label: 'Ausstellender Dienst', kind: 'issuer', icon: 'login', request: 'Authentifizierungsdaten', response: 'DAT', sync: 'Vollständiges Zertifikat'},
    {label: 'Prüfdienst', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Geschützte Funktion', sync: 'Zertifikat nur zur Prüfung'},
  ]}"
/>

Der ausstellende Dienst legt die Daten in `plain` und `secure` fest und erstellt den DAT. Der Prüfdienst kontrolliert Ablaufzeitpunkt, Signatur und Chiffrat und übergibt anschließend beide Datenbereiche an die Anwendung. `plain` ist signiert, aber nicht verschlüsselt, und darf deshalb keine Geheimnisse oder personenbezogenen Daten enthalten.

## Warum die Prüfung auch nach einem Zertifikatswechsel funktioniert

Sobald ein neues Zertifikat ausstellungsfähig ist, verwenden nachfolgende DAT dessen neue `cid`. Das vorherige Zertifikat bleibt zur Prüfung erhalten, bis die TTL der bereits ausgestellten DAT abgelaufen ist. So lassen sich Schlüsselwechsel und Prüfzeitraum vorhandener Tokens parallel betreiben.

## Geeignete Umgebungen

- Umgebungen, in denen Authentifizierung und eigentliche Funktion von verschiedenen Diensten übernommen werden
- Umgebungen, in denen mehrere Runtimes dasselbe Token ausstellen oder prüfen
- Umgebungen, die kurzlebige Berechtigungsdaten ohne zentrale Sitzungsabfrage übertragen
- Umgebungen, die öffentliche Routinginformationen und geschützte Daten in einem Token getrennt speichern müssen

DAT definiert nicht die Berechtigungsrichtlinie selbst. Die Gültigkeit eines DAT und die Entscheidung der Anwendung, eine Anfrage zuzulassen, sind getrennte Fragen.

## Nächste Dokumente

- [DAT-Spezifikation](./spec/dat): Tokenfelder und Prüfregeln
- [Zertifikate](./spec/dat-certificate): Schlüssel und Zeiträume
- [DAT-CMS-Spezifikation](./spec/cms): Synchronisierungsvertrag
- [Bibliotheken](./libs/): Einbindung in eine Anwendung

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
