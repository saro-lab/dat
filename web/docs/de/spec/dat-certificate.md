# DAT-Zertifikat

## 1. Überblick (Introduction)

Das **DAT-Zertifikat** ist eine Spezifikation zur Steuerung der Ausstellungsberechtigung von DAT (Data Authentication Token) sowie zur Verwaltung der Signatur- und Verschlüsselungsalgorithmen und der Schlüssel (Key) des Tokens.

Jedes Zertifikat besitzt eine eindeutige ID (`CID`) und verwaltet den Token-Lebenszyklus sicher, indem es den Ausstellungszeitraum des DAT sowie die Standard-Gültigkeitsdauer (TTL) der erzeugten Token vorschreibt.

---

## 2. Zertifikatsstruktur (Structure)

<Struct type="cert" />


### 2.1. Feldbeschreibungen

`CID` : Hex (uint64)

* Eine eindeutige Zertifikats-ID zur Identifizierung des Zertifikats. Sie wird mit dem `CID`-Feld des DAT abgeglichen, um bei der Validierung das zu verwendende Zertifikat zu bestimmen.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Gibt den **Startzeitpunkt** in Sekunden (Seconds) an, ab dem mit diesem Zertifikat ein DAT ausgestellt werden kann.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* Die **Ausstellungs-Gültigkeitsdauer** des Zertifikats. Nach Ablauf dieser Dauer (in Sekunden) ab `{{t('dat_issue_start')}}` kann mit diesem Zertifikat kein neues DAT mehr ausgestellt werden.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* Die Standard-Gültigkeitsdauer (Time To Live) der mit diesem Zertifikat ausgestellten DATs. Bei der DAT-Erstellung wird der `expire`-Wert auf den Ausstellungszeitpunkt (aktuelle Uhrzeit) zuzüglich `dat-ttl` gesetzt.

`{{t('sig_alg')}}` : String / Enum

* Der **Signaturalgorithmus**, der zum Erstellen und Verifizieren des `signature`-Felds des DAT verwendet wird.

`{{t('crypto_alg')}}` : String / Enum

* Der **Verschlüsselungsalgorithmus**, der zum Ver- und Entschlüsseln des `secure`-Felds des DAT verwendet wird.

`{{t('sig_key')}}` : Base64Url (Binary)

* Schlüsseldaten, die für die Signierung und Verifizierung verwendet werden. (Je nach Algorithmus kann dies ein Public/Private Key eines asymmetrischen Schlüsselpaars oder ein symmetrischer Schlüssel sein.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Verschlüsselungsschlüsseldaten, die zur Ver- und Entschlüsselung des `secure`-Felds verwendet werden.

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

Liste der Signaturalgorithmen zum Schutz des DAT vor Manipulation und Fälschung.

Es werden sowohl symmetrische als auch asymmetrische Schlüsselverfahren unterstützt.

<br/>

**`ECDSA-P256`**
- Elliptische-Kurven-Digitalsignaturalgorithmus (NIST secp256r1)


**`ECDSA-P384`**
- Elliptische-Kurven-Digitalsignaturalgorithmus (NIST secp384r1)


**`ECDSA-P521`**
- Elliptische-Kurven-Digitalsignaturalgorithmus (NIST secp521r1)


**`HMAC-SHA256-MFS`**
- Keyed-Hashing basierend auf einem 256-Bit-Geheimschlüssel fester Größe (MFS)


**`HMAC-SHA384-MFS`**
- Keyed-Hashing basierend auf einem 384-Bit-Geheimschlüssel fester Größe (MFS)


**`HMAC-SHA512-MFS`**
- Keyed-Hashing basierend auf einem 512-Bit-Geheimschlüssel fester Größe (MFS)



> **MFS (Maximum Fixed Secret):** Ein Verfahren, bei dem ein Geheimschlüssel fester Größe verwendet wird, dessen Bitlänge der Ausgabe (Output) des Hash-Algorithmus entspricht.

---

### {{t('crypto_alg')}}

Liste der authentifizierten Verschlüsselungsalgorithmen (Authenticated Encryption) zum Schutz der vertraulichen Daten im DAT (Feld `secure`).

Das Verschlüsselungsergebnis liegt in einer kombinierten Form aus IV und verschlüsselten Daten vor, um Entschlüsselung und Replay-Angriffe zu verhindern.

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + Verschlüsselungsergebnis(Binary)
- AES-GCM-Modus mit 128-Bit-Schlüssel


**`IV-AES256-GCM`**
- IV(96bit) + Verschlüsselungsergebnis(Binary)
- AES-GCM-Modus mit 256-Bit-Schlüssel


> **IV (Initialization Vector) Einbettung:** Um Replay Attacks zu verhindern, wird bei jeder Verschlüsselung ein eindeutiger 96-Bit-NONCE (IV) erzeugt und dem verschlüsselten Ergebnis als Präfix (Prefix) vorangestellt und im Binärdaten eingebettet. Bei der Entschlüsselung werden die ersten 96 Bits als IV abgetrennt und zur Entschlüsselung verwendet.


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
