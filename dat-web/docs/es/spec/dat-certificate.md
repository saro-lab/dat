# Certificado DAT

## 1. Descripción general

El **certificado DAT** es la especificación que controla el permiso de emisión de DAT y gestiona los algoritmos de firma y de cifrado del token, así como la información de las claves (Key).

Cada certificado tiene un ID único (`CID`) y gestiona de forma segura el ciclo de vida del token imponiendo el período durante el cual se puede emitir el DAT y el período de validez (TTL) de los tokens generados.

En DAT **la rotación de claves no es opcional.** Como el período de emisión está grabado en el certificado a nivel de especificación, una vez transcurrido ese período ya no se pueden crear tokens nuevos con ese certificado.

---

## 2. Estructura del certificado

<WireFormat
    title="Formato de transmisión del certificado"
    hint="Pase el cursor sobre cada campo para ver su descripción."
    :segments="[
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID único del certificado. Se coteja con el campo cid del DAT.'},
        {name: 'start', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de inicio de la emisión (Unixtime en segundos).'},
        {name: 'duration', type: 'uint64 (decimal)', kind: 'meta', note: 'Período de emisión (en segundos). Es una duración, no un instante absoluto.'},
        {name: 'ttl', type: 'uint64 (decimal)', kind: 'meta', note: 'Período de validez (en segundos) de los DAT emitidos con este certificado.'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: 'Nombre del algoritmo de firma.'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: 'Nombre del algoritmo de cifrado.'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Clave de firma. Al exportar en modo verify-only, en ECDSA solo sale la clave pública.'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Clave de cifrado. Al ser simétrica, sale siempre completa, sea o no una exportación verify-only.'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. Especificación detallada por campo

`CID` : Hex (uint64)

* Es el ID de certificado único que identifica al certificado. Se corresponde con el campo `CID` del DAT y determina qué certificado se usa durante la verificación.
* **El CID es un identificador inmutable.** Al sustituir una clave no se reutiliza el mismo CID: se emite un certificado con un CID nuevo.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Indica, en unidades de segundos (Seconds), el **momento de inicio** a partir del cual se puede emitir un DAT con este certificado.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* Es el **período de validez de emisión** del certificado. Una vez transcurrido ese período (en segundos) desde `{{t('dat_issue_start')}}`, ya no se pueden emitir nuevos DAT con este certificado.
* **Es una duración (duration), no un instante absoluto.** El momento de finalización se calcula como `start + duration`.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* Es el período de validez (Time To Live) de los DAT emitidos con este certificado. Al crear un DAT, el valor `expire` se establece sumando este valor al momento de emisión.

`{{t('sig_alg')}}` : String / Enum

* Es el **algoritmo de firma** que se utilizará para generar y verificar el campo `signature` del DAT.

`{{t('crypto_alg')}}` : String / Enum

* Es el **algoritmo de cifrado** que se utilizará para cifrar y descifrar el campo `secure` del DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* Son los datos de la clave utilizada para firmar y verificar. (Según el algoritmo, puede ser la clave pública/privada de una clave asimétrica o una clave simétrica).

`{{t('crypto_key')}}` : Base64Url (Binary)

* Son los datos de la clave de cifrado utilizada para cifrar y descifrar el campo `secure`.

### 2.2. Cálculo de tiempos

```
end    = start + duration        momento de fin de la emisión
expire = end + ttl               momento de expiración final del certificado
```

* Todos los cálculos se realizan en uint64 y **solo el desbordamiento se rechaza como error**.
* `duration = 0` y `ttl = 0` son **valores legales**. Permiten expresar un certificado cuya ventana de emisión se cierra de inmediato, o un certificado que produce tokens que quedan invalidados nada más expirar.
* Como todos los campos son enteros sin signo, **los valores negativos no existen desde el punto de vista del tipo.**

### 2.3. Firma del constructor

Todas las implementaciones de los distintos lenguajes utilizan el siguiente orden de argumentos.

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning El tercer argumento no es el momento de fin, sino una duración
Si pasa el momento absoluto de finalización (end) como tercer argumento, no se produce ningún error, pero se crea **un certificado con una ventana de validez equivocada**, porque ese valor se usa tal cual en `start + duration`.
:::

---

## 3. Ciclo de vida del certificado

<CertTimeline
    title="Las cuatro fases del certificado"
    caption="El certificado solo expira definitivamente tras recorrer las fases de retraso de emisión, emisión disponible y TTL restante del DAT."
    :marks="['Creación', 'Inicio de emisión', 'Fin de emisión', 'Expiración final']"
    :phases="[
        {label: 'Retraso de emisión (delay)', weight: 1.2, kind: 'delay', note: 'Tiempo para que todos los nodos recojan el certificado'},
        {label: 'Emisión disponible (duration)', weight: 3, kind: 'issue', note: 'Se puede emitir y verificar DAT'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'No se puede emitir, solo verificar'},
    ]"
/>

| Fase | Emisión | Verificación | Determinación |
| --- | --- | --- | --- |
| Retraso de emisión | ✕ | ○ | `issuable() == false` |
| Emisión disponible | ○ | ○ | `issuable() == true` |
| TTL restante del DAT | ✕ | ○ | La ventana de emisión está cerrada, pero aún no ha expirado |
| Después de la expiración final | ✕ | ✕ | `expired() == true` |

* La **posibilidad de emitir** se determina con `signable() && start <= now <= end`, e **incluye ambos extremos**.
* Aunque la ventana de emisión se cierre, el certificado sigue vivo durante `ttl` más. Esto es así para que un token emitido justo antes de que se cierre la ventana pueda agotar su propia vida.
* La fase de **retraso de emisión (delay)** existe para dar tiempo a que todos los nodos del clúster recojan el nuevo certificado. Para más detalles, consulte el documento [{{t('menu_spec_cms')}}](./cms).

---

## 4. Algoritmos

### 4.1. Algoritmos de firma

Lista de algoritmos de firma para evitar la falsificación y la alteración del DAT. Se admiten métodos de clave simétrica y de clave asimétrica.

| Nombre | Método | Notas |
| --- | --- | --- |
| `ECDSA-P256` | Asimétrico | Firma digital de curva elíptica (NIST secp256r1) |
| `ECDSA-P384` | Asimétrico | Firma digital de curva elíptica (NIST secp384r1) |
| `ECDSA-P521` | Asimétrico | Firma digital de curva elíptica (NIST secp521r1) |
| `HMAC-SHA256-MFS` | Simétrico | Keyed-Hashing basado en una clave secreta de tamaño fijo de 256 bits |
| `HMAC-SHA384-MFS` | Simétrico | Keyed-Hashing basado en una clave secreta de tamaño fijo de 384 bits |
| `HMAC-SHA512-MFS` | Simétrico | Keyed-Hashing basado en una clave secreta de tamaño fijo de 512 bits |

> **MFS (Maximum Fixed Secret):** método que utiliza una clave secreta de tamaño fijo con el mismo número de bits que el tamaño de salida (Output) del algoritmo de hash.

### 4.2. Algoritmos de cifrado

Lista de algoritmos de cifrado autenticado (Authenticated Encryption) para proteger los datos confidenciales del interior del DAT (campo `secure`).

| Nombre | Longitud de clave | Estructura |
| --- | --- | --- |
| `IV-AES128-GCM` | 128 bits | IV(96bit) + resultado del cifrado |
| `IV-AES256-GCM` | 256 bits | IV(96bit) + resultado del cifrado |

> **Incorporación del IV (Initialization Vector):** un NONCE (IV) único de 96 bits, generado en cada operación de cifrado, se combina como prefijo (Prefix) delante del resultado del cifrado. Durante el descifrado, los primeros 96 bits se separan como IV para realizar el descifrado.

### 4.3. Validación de la longitud de la clave

Al importar un certificado se **comprueba que el número de bits del algoritmo declarado coincide con la longitud real de la clave**.

Por ejemplo, si un certificado declara `IV-AES256-GCM` pero contiene una clave de 16 bytes, la importación se rechaza sin más. Sin esta comprobación se creería estar usando AES-256 mientras que en realidad se estaría operando con AES-128.

---

## 5. Exportación verify-only

A los servidores que solo verifican no hace falta darles la clave privada de firma. Por eso el certificado DAT ofrece la **exportación verify-only**.

<FlowDiagram
    title="Rutas de distribución del certificado completo y del certificado verify-only"
    :legend="{req: 'Solicitud', res: 'Respuesta', sync: 'Distribución del certificado'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Servidor emisor', kind: 'issuer'},
        {id: 'verifier', label: 'Servidor solo de verificación', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: 'Certificado completo (incluye la clave privada de firma)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'Certificado verify-only', kind: 'sync'},
    ]"
/>

| Algoritmo de firma | `support_verify_only()` | Resultado de la exportación verify-only |
| --- | --- | --- |
| Familia **ECDSA** | `true` | De la clave de firma sale **solo la clave pública** (de 130 a 87 caracteres Base64) |
| Familia **HMAC** | `false` | Se produce un **error explícito** |

HMAC es una clave simétrica, por lo que no existe eso de una "clave que solo sirve para verificar". Por eso, cuando se intenta una exportación verify-only, no se omite en silencio, sino que **se avisa de inmediato con un error**. Si se deja mezclado un certificado HMAC, la exportación verify-only falla, así que quien opere nodos exclusivos de verificación debe usar la familia ECDSA.

::: danger La clave de cifrado sale completa incluso en verify-only
La clave AES del campo `secure` es **simétrica**, por lo que **siempre se exporta completa**, sea o no una exportación verify-only. Para descifrar hace falta la misma clave con la que se cifró.

Es decir, un servidor que recibe un certificado verify-only:

* **No puede falsificar firmas** — al no tener la clave privada, no puede crear nuevos DAT.
* **Sí puede descifrar la carga útil `secure`** — frente a él no se ofrece confidencialidad.

verify-only es un mecanismo para repartir el *permiso de emisión*, no para repartir la *confidencialidad*. Si un valor debe permanecer oculto a los nodos de verificación, no debe colocarse en `secure`.
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
