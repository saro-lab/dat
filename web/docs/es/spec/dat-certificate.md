# Certificado DAT

## 1. Descripción general (Introduction)

El **certificado DAT** es una especificación para controlar los permisos de emisión de DAT (Data Authentication Token) y gestionar la información de algoritmos de firma y cifrado, así como las claves (Key) del token.

Cada certificado tiene un ID único (`CID`) y gestiona de forma segura el ciclo de vida del token al imponer el período durante el cual se puede emitir el DAT y el período de validez predeterminado (TTL) de los tokens generados.

---

## 2. Estructura del certificado (Structure)

<Struct type="cert" />


### 2.1. Especificación detallada por campo

`CID` : Hex (uint64)

* Es el ID de certificado único que identifica al certificado. Se mapea con el campo `CID` del DAT para determinar qué certificado se utilizará durante la verificación.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Indica el **tiempo de inicio** en unidades de segundos (Seconds) a partir del cual se puede emitir un DAT utilizando este certificado.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* Es el **período de validez de emisión** del certificado. Una vez transcurrido este período (en segundos) desde `{{t('dat_issue_start')}}`, no se podrán emitir nuevos DAT con este certificado.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* Es el período de validez predeterminado (Time To Live) de los DAT emitidos con este certificado. Al crear un DAT, el valor `expire` se establece sumando `dat-ttl` al tiempo de emisión (tiempo actual).

`{{t('sig_alg')}}` : String / Enum

* Es el **algoritmo de firma** que se utilizará para generar y verificar el campo `signature` del DAT.

`{{t('crypto_alg')}}` : String / Enum

* Es el **algoritmo de cifrado** que se utilizará para cifrar y descifrar el campo `secure` del DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* Datos de clave utilizados para la firma y verificación. (Según el algoritmo, puede ser la clave pública/privada de una clave asimétrica o una clave simétrica.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Datos de clave de cifrado utilizados para el cifrado y descifrado del campo `secure`.

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

Lista de algoritmos de firma para la prevención de falsificación o alteración del DAT.

Se admiten métodos de clave simétrica y clave asimétrica.

<br/>

**`ECDSA-P256`**
- Algoritmo de firma digital de curva elíptica (NIST secp256r1)


**`ECDSA-P384`**
- Algoritmo de firma digital de curva elíptica (NIST secp384r1)


**`ECDSA-P521`**
- Algoritmo de firma digital de curva elíptica (NIST secp521r1)


**`HMAC-SHA256-MFS`**
- Keyed-Hashing basado en clave secreta de tamaño fijo de 256 bits (MFS)


**`HMAC-SHA384-MFS`**
- Keyed-Hashing basado en clave secreta de tamaño fijo de 384 bits (MFS)


**`HMAC-SHA512-MFS`**
- Keyed-Hashing basado en clave secreta de tamaño fijo de 512 bits (MFS)



> **MFS (Maximum Fixed Secret):** Método que utiliza una clave secreta de tamaño fijo con el mismo número de bits que el tamaño de salida (Output) del algoritmo de hash.

---

### {{t('crypto_alg')}}

Lista de algoritmos de cifrado autenticado (Authenticated Encryption) para proteger los datos confidenciales (`secure` campo) dentro del DAT.

El resultado del cifrado tiene una forma combinada de IV y datos cifrados para evitar el descifrado y los ataques de reutilización (Replay Attack).

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + resultado_cifrado(Binary)
- Modo AES-GCM con clave de 128 bits


**`IV-AES256-GCM`**
- IV(96bit) + resultado_cifrado(Binary)
- Modo AES-GCM con clave de 256 bits


> **Incorporación de IV (Initialization Vector):** Para prevenir los ataques de reutilización (Replay Attack), un NONCE (IV) único de 96 bits generado en cada operación de cifrado se combina como prefijo (Prefix) al inicio de los datos resultantes del cifrado y queda incluido en el binario. Durante el descifrado, los primeros 96 bits se separan como IV para realizar el descifrado.


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
