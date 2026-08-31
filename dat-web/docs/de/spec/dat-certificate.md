# Zertifikate

Ein DAT-Zertifikat stellt Zeitraum, Algorithmen und Schlüssel für die Ausstellung und Prüfung von Tokens in einer einzigen Zeichenfolge dar.

<WireFormat
  hint="Auch ein Zertifikat besteht aus durch Punkte getrennten ASCII-Feldern in fester Reihenfolge."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Unveränderliche Zertifikat-ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Beginn der Ausstellung'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Ausstellungszeitraum'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Gültigkeitsdauer des DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Signaturalgorithmus'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Verschlüsselungsalgorithmus'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Signatur- oder Prüfschlüssel'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Verschlüsselungsschlüssel'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Zeitraum

<CertTimeline />

- Das Zertifikat kann von `start` bis `start + duration` DAT ausstellen. Beide Zeitpunkte sind eingeschlossen.
- Ein ausgestellter DAT ist ab seiner Ausstellung für `ttl` gültig.
- Das Zertifikat wird bis `start + duration + ttl` zur Prüfung benötigt. Auch genau zu diesem Zeitpunkt ist eine Prüfung möglich.

Wird ein Zertifikat unmittelbar nach Ende des Ausstellungszeitraums gelöscht, können bereits ausgestellte DAT nicht mehr geprüft werden. Manager und CMS behandeln Ausstellungsfähigkeit und Prüffähigkeit getrennt.

## Zertifikat-ID und Schlüsselwechsel

`cid` ist der öffentliche Vertrag zur Identifikation von Schlüsseln und Zeitraum. Überschreiben Sie eine vorhandene `cid` niemals mit anderen Schlüsseln. Erstellen Sie für einen Schlüsselwechsel ein neues Zertifikat mit einer neuen `cid`. Dienste synchronisieren das neue Zertifikat vorab und entfernen das vorherige erst, wenn alle damit ausgestellten DAT abgelaufen sind.

## Signaturalgorithmen

| Name | Verwendung | Zertifikat nur zur Prüfung |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Nicht unterstützt |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Nicht unterstützt |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Nicht unterstützt |
| `ECDSA-P256` | ECDSA P-256 | Unterstützt |
| `ECDSA-P384` | ECDSA P-384 | Unterstützt |
| `ECDSA-P521` | ECDSA P-521 | Unterstützt |

HMAC verwendet denselben Schlüssel zum Signieren und Prüfen. Erhält ein Prüfdienst den Schlüssel, kann er deshalb ebenfalls Tokens ausstellen. Verwenden Sie in Umgebungen mit getrennter Ausstellungsberechtigung ECDSA und Zertifikate nur zur Prüfung.

## Verschlüsselungsalgorithmen

| Name | Schlüssel |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Die Algorithmusnamen sind Teil des wire-Vertrags. Sie werden nicht durch die in JWT verwendeten Aliasse ersetzt.

## Vollständige Zertifikate und Zertifikate nur zur Prüfung

Ein vollständiges ECDSA-Zertifikat enthält den privaten Schlüssel zum Signieren. Ein Zertifikat nur zur Prüfung behält lediglich den öffentlichen ECDSA-Schlüssel, enthält aber weiterhin den AES-Schlüssel zur Entschlüsselung von `secure`. Ein reiner Prüfdienst kann DAT daher prüfen und entschlüsseln, aber keine neuen DAT ausstellen.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
