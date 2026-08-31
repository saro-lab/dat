# DAT

Ein DAT ist eine ASCII-Zeichenfolge mit durch Punkte (`.`) getrennten Feldern. Jedes Feld erscheint genau einmal in einer festen Reihenfolge. Die Signatur bestätigt, dass die vorherigen Felder unverändert übertragen wurden.

<WireFormat
  hint="Feldreihenfolge und Trennzeichen sind Teil der Spezifikation."
  :segments="[
    {name: 'expire', type: 'uint64 (dezimal)', kind: 'meta', note: 'Unix time des Ablaufs'},
    {name: 'cid', type: 'uint64 (hexadezimal)', kind: 'meta', note: 'Zertifikat-ID'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Öffentliche Bytes'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Verschlüsselte Bytes'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signatur der vier vorherigen Felder'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Felder

| Feld | Darstellung | Bedeutung |
| --- | --- | --- |
| `expire` | Dezimaldarstellung einer vorzeichenlosen Ganzzahl | Unix time, zu der DAT abläuft |
| `cid` | Kleingeschriebene Hexadezimaldarstellung einer vorzeichenlosen Ganzzahl | ID des Zertifikats für die Prüfung |
| `plain` | Base64Url ohne padding | Unverschlüsselte Bytes |
| `secure` | Base64Url ohne padding | Mit dem Verschlüsselungsalgorithmus des Zertifikats geschützte Bytes |
| `signature` | Base64Url ohne padding | Signatur über die ursprünglichen ASCII-Bytes von `expire.cid.plain.secure` |

`plain` liegt im Signaturbereich und kann deshalb nicht verändert werden, lässt sich aber von jedem decodieren. Geheimnisse, personenbezogene Daten und Werte, die unmittelbar für Berechtigungsentscheidungen verwendet werden, gehören in `secure`. Ein leeres `secure` ist ebenfalls gültig.

## Kanonische Form

- Der vollständige DAT muss aus ASCII bestehen.
- Zahlen werden ohne Vorzeichen, Leerzeichen, Präfixe oder unnötige führende Nullen dargestellt. Nur der Wert `0` wird als `0` geschrieben.
- Base64Url verwendet das URL-safe-Alphabet und erlaubt weder `=`-padding noch Leerzeichen.
- Nicht kanonische Base64Url-Darstellungen, die dieselben Bytes durch unterschiedliche Zeichenfolgen ausdrücken, werden abgelehnt.
- Bei abweichender Anzahl oder Reihenfolge der Felder handelt es sich nicht um einen DAT.

Diese Regeln verhindern, dass verschiedene Implementierungen unterschiedliche Zeichenfolgen als denselben DAT akzeptieren.

## Ausstellung

1. Wählen Sie ein derzeit ausstellungsfähiges Zertifikat.
2. Addieren Sie die TTL des Zertifikats zur aktuellen Zeit, um `expire` zu erzeugen.
3. Codieren Sie `plain` als Base64Url.
4. Verschlüsseln Sie `secure` mit dem Verschlüsselungsalgorithmus des Zertifikats.
5. Signieren Sie die ASCII-Bytes der durch Punkte verbundenen vorherigen Felder.

Eine Ausstellung ist nur innerhalb des Ausstellungszeitraums des Zertifikats möglich: `start <= now <= start + duration`.

## Prüfung

1. Parsen Sie den DAT nach den kanonischen Regeln.
2. Prüfen Sie, ob `expire > now` gilt. Bei `expire == now` ist der DAT abgelaufen.
3. Suchen Sie das Zertifikat für `cid` und prüfen Sie, ob es prüffähig ist.
4. Prüfen Sie die Signatur der ursprünglichen Bytes von `expire.cid.plain.secure`.
5. Authentifizieren und entschlüsseln Sie `secure` und geben Sie es zusammen mit `plain` zurück.

Parsing-API, die keine Signatur prüfen, dienen nur zur Beobachtung oder Diagnose. Ihre Ergebnisse dürfen nicht zur Authentifizierung oder Vergabe von Berechtigungen verwendet werden.

## Verantwortlichkeiten außerhalb der Spezifikation

DAT definiert weder Benutzerspeicher noch Anmeldeverfahren, Berechtigungsmodell, Header für die Tokenübertragung oder Sperrliste. Die Anwendung entscheidet, welche Anfragen sie anhand des geprüften payload zulässt.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
