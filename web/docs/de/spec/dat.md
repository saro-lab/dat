# DAT (Data Authentication Token)

## 1. Überblick (Introduction)

Mit steigender Anzahl gleichzeitiger Benutzer wächst auch die Anzahl der Sitzungen (Sessions), was zu einer übermäßigen Last auf dem Sitzungsserver führt.

**DAT** ist eine Token-Spezifikation, die entwickelt wurde, um die Lastprobleme solcher Sitzungsserver zu lösen und eine effiziente, zustandslose (Stateless) Authentifizierung ohne gemeinsamen Zustand zwischen Servern zu ermöglichen.

---

## 2. Token-Struktur (Structure)

<Struct type="dat" />

### 2.1. Feldbeschreibungen

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Gibt die Ablaufzeit des Tokens als vorzeichenlose 64-Bit-Ganzzahl in Sekunden (Seconds) an.

`CID` : Hex (uint64)
- Die Zertifikats-ID (Certificate ID), die zur Token-Validierung verwendet wird.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Enthält Daten, die für den Client öffentlich zugänglich sind. Unterstützt neben Zeichenketten auch Binärdaten, die vom Client dekodiert und eingesehen werden können.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Enthält Daten, die vor dem Client verborgen bleiben. Diese sind mit einem zertifikatsbasierten Verschlüsselungsalgorithmus verschlüsselt, sodass der Client den Inhalt nicht entschlüsseln kann.

`{{t('sig')}}` : Base64Url (Binary)
- Signaturdaten zur Überprüfung der Integrität und Authentizität des Tokens. Sie werden erzeugt, indem die vorangehenden Felder mit dem Signaturalgorithmus des Zertifikats signiert werden.

---

## 3. Vergleich mit JWT

DAT und JWT (JSON Web Token) teilen eine durch Punkte (`.`) getrennte Token-Struktur sowie eine Validierung mittels `signature`, unterscheiden sich jedoch im internen Design in den folgenden wesentlichen Punkten.

### 3.1. Vergleich der strukturellen Unterschiede

* **JWT-Struktur**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT-Struktur**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. Wesentliche Unterschiede

* **Binärbasierte Kompaktheit:** JWT verarbeitet Header und Body als JSON-Zeichenketten, während DAT **Binärdaten (Binary) direkt verarbeitet**, um die Datengröße zu optimieren und die Parsing-Effizienz zu erhöhen.
* **Integrierte Sicherheit (Feld `{{t('dat_secure')}} (secure)`):** Bei JWT ist der Payload standardmäßig im Klartext sichtbar; soll er verschlüsselt werden, muss eine separate Spezifikation wie JWE angewendet werden. DAT hingegen **unterstützt Verschlüsselung nativ über das Feld `{{t('dat_secure')}}`** direkt im Token.
* **Erzwungene Ablaufzeitbeschränkung:** In JWT ist das Feld `exp` (Claims) optional, während in DAT das **Feld `{{t('dat_expire')}} (expire)` strukturell verpflichtend** ist, sodass die Gültigkeitsprüfung zwingend durchgeführt wird.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
