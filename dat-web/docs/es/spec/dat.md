# DAT (Distributed Access Token)

## 1. Descripción general

A medida que aumenta el número de usuarios conectados simultáneamente, el número de sesiones (Session) crece con ellos y se produce una carga excesiva sobre el servidor de sesiones.

**DAT** es una especificación de token concebida para resolver ese problema de carga del servidor de sesiones e implementar una autenticación eficiente que no comparte estado entre servidores (Stateless).

DAT es una cadena formada por **5 campos fijos** separados por puntos (`.`). Cada campo se puede recortar únicamente a partir de la posición de los separadores, sin análisis JSON, y tanto el momento de expiración como el área cifrada forman parte de la propia especificación.

---

## 2. Formato de transmisión

<WireFormat
    title="Formato de transmisión de DAT"
    hint="Pase el cursor sobre cada campo para ver su descripción."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de expiración del token. Entero decimal en segundos de Unixtime.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID del certificado que se usará para la verificación. Se escribe en hexadecimal en minúsculas.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Datos que se hacen públicos al cliente. Cualquiera puede decodificarlos.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Datos cifrados. Tiene la estructura IV(96bit) + texto cifrado AES-GCM; si está vacío, es una cadena vacía.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Firma sobre los cuatro campos anteriores. Este campo impide la falsificación y la alteración.'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| Campo | Tipo | Codificación | Notas |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | cadena decimal | Unixtime (segundos) |
| `CID` | uint64 | cadena hexadecimal | ID del certificado |
| `{{t('dat_plain')}}` | Binary | Base64Url (sin relleno) | Datos públicos |
| `{{t('dat_secure')}}` | Binary | Base64Url (sin relleno) | Datos cifrados |
| `{{t('sig')}}` | Binary | Base64Url (sin relleno) | Firma |

<Struct type="dat" />

### 2.1. Especificación detallada por campo

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Representa el momento de expiración del token como un entero de 64 bits sin signo en unidades de segundos (Seconds).
- **Solo se admiten dígitos decimales puros.** Si contiene signo, espacios o separadores, es un error de formato.

`CID` : Hex (uint64)
- Es el ID del certificado (Certificate ID) que se utilizará para verificar el token.
- **Solo se admiten dígitos hexadecimales puros** y no se usa el prefijo `0x`.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Contiene los datos que se harán públicos al cliente. Admite no solo cadenas de texto, sino también datos binarios, que el cliente puede decodificar y consultar.
- **No se cifra.** No se deben colocar aquí valores sensibles.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Contiene los datos que se mantendrán ocultos al cliente. Está cifrado con el algoritmo de cifrado del certificado, por lo que un cliente que no disponga del certificado no puede descifrar su contenido.
- Su estructura interna es `IV(96bit) + texto cifrado`, y el IV se genera de nuevo en cada operación de cifrado.

`{{t('sig')}}` : Base64Url (Binary)
- Son los datos de firma que permiten verificar la falsificación o alteración del token. Se generan firmando los campos anteriores con el algoritmo de firma del certificado.
- En un token cuya verificación de firma falla no se debe confiar en ningún campo.

---

## 3. Reglas canónicas (Canonical Rules)

Para que clientes implementados en distintos lenguajes **interpreten el mismo token exactamente igual**, las reglas siguientes no pueden diferir entre implementaciones. La implementación de referencia es Rust (`dat-rust`), y todas las demás se ajustan a estas reglas.

### 3.1. Análisis de los campos numéricos

`expire` y `cid` se interpretan de forma **estricta**. Todas las entradas siguientes se rechazan como error de formato.

| Ejemplo de entrada | Resultado | Motivo |
| --- | --- | --- |
| `100` | Aceptado | Decimal puro |
| `007` | Aceptado | Se permiten ceros a la izquierda |
| `+100` | Rechazado | No se admite el signo |
| `-1` | Rechazado | No se admite el signo |
| `" 100 "` | Rechazado | No se admiten espacios |
| `1_0` | Rechazado | No se admiten separadores |
| `0x10` | Rechazado | No se admiten prefijos |
| `zzzz` | Rechazado | No es un número |
| `""` | Rechazado | Cadena vacía |
| `18446744073709551616` | Rechazado | Excede el rango de uint64 |

::: warning Por qué hay que ser estricto
Un analizador permisivo convierte `-1` en el valor máximo de uint64 y crea así **un token que en la práctica nunca expira**, o transforma silenciosamente en `0` un valor que no es numérico. Si la permisividad varía entre implementaciones, el mismo token pasa en un lado y se rechaza en otro, y la interoperabilidad se rompe.
:::

### 3.2. Determinación de la expiración

**El token DAT y el certificado tienen límites de expiración distintos.** No los confunda.

| Objeto | Condición de validez | En el instante exacto de expiración (`expire == now`) |
| --- | --- | --- |
| **Token DAT** | `expire > now` | **Se rechaza por expirado** |
| **Certificado** | `expire >= now` | **Todavía es válido** |

El token deja de ser válido en el instante mismo en que llega su momento de expiración, mientras que el certificado sigue siendo válido hasta ese instante. El certificado debe vivir un tic más que el token para poder verificar los tokens emitidos justo en el límite.

### 3.3. Carga útil `secure` vacía

Si no hay datos que cifrar, `secure` es una **cadena vacía**.

- `encrypt(entrada vacía)` → salida vacía (no se añade ni IV ni etiqueta GCM)
- `decrypt(entrada vacía)` → salida vacía
- Si no está vacío pero su longitud es menor o igual a la del IV (12 bytes), es un **error de descifrado**.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ token normal con la posición de secure vacía
```

---

## 4. Emisión y verificación

<FlowDiagram
    title="DAT: emisión → entrega → verificación"
    :legend="{req: 'Solicitud', res: 'Respuesta', sync: 'Sincronización de certificados'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Servidor emisor', kind: 'issuer'},
        {id: 'client', label: 'Cliente', kind: 'client'},
        {id: 'verifier', label: 'Servidor verificador', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: 'Distribución del certificado', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: 'Distribución del certificado', kind: 'sync'},
        {from: 'client', to: 'issuer', label: 'Inicio de sesión', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'Emisión del DAT', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'Solicitud con DAT adjunto', kind: 'req'},
        {from: 'verifier', label: 'Buscar el certificado por CID → verificar la firma → descifrar', kind: 'note'},
        {from: 'verifier', to: 'client', label: 'Respuesta', kind: 'res'},
    ]"
/>

### 4.1. Procedimiento de emisión

1. El gestor elige, entre los certificados que posee, uno que sea **emisible (issuable)**.
2. Calcula `expire = now + dat_ttl_seconds`.
3. Codifica `plain` en Base64Url y, en el caso de `secure`, lo cifra y después lo codifica en Base64Url.
4. Firma la cadena `expire.cid.plain.secure` y añade la firma como último campo.

### 4.2. Procedimiento de verificación

1. Divide la cadena en 5 campos por el punto (`.`). Si el número de campos es distinto, es un error de formato.
2. Comprueba `expire`. Un token expirado se rechaza antes de verificar la firma.
3. Busca el certificado por `cid`. Si no existe, no se puede verificar.
4. Verifica la firma sobre el tramo `expire.cid.plain.secure`.
5. Solo después de una verificación correcta se descifra `secure`.

::: danger No confíe en los valores anteriores a la verificación de la firma
Algunas implementaciones ofrecen una API para extraer los campos sin comprobar la firma (del tipo `parse without verify`). Esos valores están **totalmente bajo el control del atacante** y solo deben usarse con fines de registro y depuración.
:::

---

## 5. Comparación con JWT

DAT y JWT (JSON Web Token) comparten la estructura de token separada por puntos (`.`) y el método de verificación mediante firma, pero presentan las siguientes diferencias esenciales en su diseño interno.

### 5.1. Comparación de las diferencias estructurales

* **Estructura JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Estructura DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. Diferencias clave

* **Ligereza basada en Binary:** JWT maneja el Header y el Body en forma de cadenas JSON, mientras que DAT **trabaja directamente con datos binarios (Binary)**, con lo que optimiza el tamaño de los datos y mejora la eficiencia del análisis.
* **Seguridad incorporada (campo `{{t('dat_secure')}}`):** en JWT, el Payload queda expuesto en texto plano de forma predeterminada, por lo que si se necesita cifrado hay que aplicar una especificación aparte como JWE. En cambio, DAT **admite el cifrado por sí mismo a través del campo `{{t('dat_secure')}}`**.
* **Restricción obligatoria del momento de expiración:** en JWT el campo `exp` (Claims) es opcional, pero en DAT **el campo `{{t('dat_expire')}}` es obligatorio dentro de la estructura del token**, por lo que la verificación del período de validez se realiza siempre.
* **Sin negociación de algoritmo:** JWT lleva en su propia cabecera el valor `alg`, lo que crea una superficie de ataque de confusión de algoritmos. En DAT, el algoritmo **lo decide el certificado** y el token no contiene información alguna sobre él.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
