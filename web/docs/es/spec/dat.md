# DAT (Data Authentication Token)

## 1. Descripción general (Introduction)

A medida que aumenta el número de usuarios conectados simultáneamente, el número de sesiones (Session) también crece, lo que genera una carga excesiva en el servidor de sesiones.

**DAT** es una especificación de token diseñada para resolver este problema de carga en el servidor de sesiones e implementar una autenticación eficiente sin estado (Stateless) que no comparte estado entre servidores.

---

## 2. Estructura del token (Structure)

<Struct type="dat" />

### 2.1. Especificación detallada por campo

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Representa el tiempo de expiración del token como un entero de 64 bits sin signo en unidades de segundos (Seconds).

`CID` : Hex (uint64)
- Es el ID del certificado (Certificate ID) que se utilizará para la verificación del token.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Contiene los datos que se harán públicos al cliente. Admite no solo cadenas de texto, sino también datos binarios, que el cliente puede decodificar y consultar.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Contiene los datos que se mantendrán privados para el cliente. Están cifrados con un algoritmo de cifrado basado en certificados, por lo que el cliente no puede descifrar su contenido.

`{{t('sig')}}` : Base64Url (Binary)
- Datos de firma para verificar la falsificación o alteración del token. Se generan firmando los campos anteriores con el algoritmo de firma del certificado.

---

## 3. Comparación con JWT

DAT y JWT (JSON Web Token) comparten una estructura de token separada por puntos (`.`) y un método de verificación mediante firma (`signature`), pero existen las siguientes diferencias clave en su diseño interno.

### 3.1. Comparación de diferencias estructurales

* **Estructura JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Estructura DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. Diferencias clave

* **Optimización ligera basada en Binary:** JWT maneja el Header y el Body en formato de cadena JSON, mientras que DAT optimiza el tamaño de los datos y mejora la eficiencia del análisis al **manejar directamente datos binarios (Binary)**.
* **Seguridad incorporada (campo `{{t('dat_secure')}} (secure)`):** En JWT, el Payload (carga útil) queda expuesto en texto plano de forma predeterminada, por lo que si se requiere cifrado es necesario aplicar una especificación separada como JWE. En cambio, DAT **admite la funcionalidad de cifrado de forma nativa a través del campo `{{t('dat_secure')}}`**.
* **Restricción obligatoria del tiempo de expiración:** En JWT, el campo `exp` (Claims) es opcional, pero en DAT **el campo `{{t('dat_expire')}} (expire)` está obligatoriamente integrado en la estructura del token**, por lo que la verificación del período de validez se realiza de forma obligatoria.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
