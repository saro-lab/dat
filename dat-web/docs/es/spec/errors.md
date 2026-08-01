# Códigos de error

Estos son los códigos de error comunes a las bibliotecas de servicio con soporte oficial de DAT.

Cada código lleva dos valores — **impacto** y **reintento** — y algunos reciben además la etiqueta **sospecha**.

## Impacto — el golpe que recibe el servicio

Es el criterio para lanzar una alerta. Solo se mira una cosa: "¿está el servicio detenido ahora mismo?".

| Impacto | Significado | Ejemplo |
| --- | --- | --- |
| <span class="lg lg-critical">Crítico</span> | El servicio o una función concreta **se detiene.** Emisión imposible, sincronización con fallo permanente, fallo de inicialización | El servidor emisor no tiene ni un solo certificado utilizable |
| <span class="lg lg-partial">Parcial</span> | Algunas peticiones o ciclos fallan, pero el servicio sigue funcionando. Por lo general se recupera solo | Falla un ciclo del CMS. Todo continúa con los certificados ya existentes |
| <span class="lg lg-none">Sin impacto</span> | Se rechaza una petición y ya está | Llega un token manipulado. Basta con filtrarlo |

**Sin impacto** no es un caso de alerta. Si todo el equipo de guardia tuviera que revisar porque llegó una entrada errónea una sola vez, la alerta perdería todo su sentido.

## Sospecha — investigar si persiste

Los códigos con la etiqueta <span class="lg lg-suspect">Sospecha</span> **forman parte de la operación normal cuando aparecen de forma aislada**. Un cliente puede enviar valores erróneos en cualquier momento, y el papel de la biblioteca es precisamente filtrarlos.

Ahora bien, si estos errores se producen **de forma persistente o concentrados desde un origen concreto**, se trata de uno de estos dos casos.

- **Anomalía de configuración** — un despliegue incorrecto, clientes de una versión antigua que siguen activos, o certificados desalineados.
- **Intento de intrusión** — un intento de superar la verificación con tokens o claves manipulados, o un sondeo en busca de valores válidos.

Por eso, para estos códigos lo correcto es **registrar el número de ocurrencias como métrica**. Basta con avisar cuando se supere un umbral.

## Reintento

| Reintento | Significado |
| --- | --- |
| <span class="lg lg-transient">Transitorio</span> | Se resuelve reintentando tras un backoff |
| <span class="lg">Permanente</span> | No reintentar. Hay que corregir la configuración o la entrada |
| <span class="lg">Estado</span> | No es un error, sino una señal |

---

## Token

Problemas con la propia cadena del token recibido.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="Rechazar la petición">
Las partes separadas por puntos no son exactamente cinco, <code>expire</code> no es decimal puro, <code>cid</code> no es hexadecimal puro, <code>plain</code> o <code>secure</code> no están en base64url, o un campo numérico supera el rango entero representable.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="Inducir la reemisión del token">
<code>expire &lt;= now</code>. <strong>El instante exacto también cuenta como expirado</strong> — si <code>expire == now</code>, el token ya está expirado.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="Revisar los registros">
Un error de token que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

::: tip Nunca confundas expiración con error de formato
Las reacciones son opuestas: la expiración es un fin de vida normal y basta con hacer renovar el token; un error de formato significa que el token nunca fue emitido por nosotros y debe rechazarse.

El análisis **determina primero la estructura** y solo después examina los valores. Una cadena como `"1.2.3"`, a la que le faltan partes, no es un token expirado sino que no es un token en absoluto: por eso es `DAT_TOKEN_MALFORMED`.

Un signo en el campo `expire`, como `+100`, tampoco es una expiración sino un error de formato. Solo se admiten dígitos ASCII puros.
:::

---

## Certificado

El formato de la cadena del certificado y la cuestión de si ese certificado puede usarse ahora.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="Volver a desplegar el certificado">
Las partes separadas por puntos no son exactamente ocho, ha fallado el análisis de <code>cid</code>, <code>start</code>, <code>duration</code> o <code>ttl</code>, un campo de clave no está en base64url, o <code>start + duration + ttl</code> supera u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="Renovar el certificado">
<code>start + duration + ttl &lt; now</code>. Completamente expirado: no es posible ni emitir ni verificar.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="Esperar">
<code>now &lt; start</code>. La ventana de emisión todavía no se ha abierto.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="Desplegar un certificado nuevo">
<code>now &gt; start + duration</code>, pero aún queda ttl. Ya no se puede emitir, solo verificar.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="Revisar la configuración de despliegue">
Un certificado que contiene solo la clave pública, sin la clave privada de firma. Verificar funciona, emitir no.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="Rechazar la petición">
No se dispone de ningún certificado para el <code>cid</code> del token. O bien es un token falsificado, o bien un despliegue erróneo.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="Reintentar tras la sincronización">
Ese <code>cid</code> aún no se ha recibido del CMS. Aparece brevemente justo después de desplegar un certificado nuevo.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="Revisar la respuesta del servidor">
El mismo <code>cid</code> aparece más de una vez en la lista que se importa.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="Revisar los registros">
Un error de certificado que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

`DAT_CERT_NOT_FOUND` y `DAT_CERT_NOT_SYNCED` presentan los mismos síntomas, pero requieren reacciones distintas. El primero corresponde a un `cid` que nunca hemos emitido: esperar no cambia nada. El segundo se resuelve en cuanto se produce la sincronización.

Un `DAT_CERT_NOT_FOUND` aislado basta con filtrarlo; si la cifra crece de golpe, significa que el despliegue se ha desalineado o que circulan tokens falsificados.

---

## Firma

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="Bloquear la sesión, registro de seguridad">
La verificación de la firma terminó en <strong>discrepancia</strong>. El valor HMAC no coincide, o ECDSA verify devuelve false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="Rechazar la petición">
La parte de la firma está vacía, no está en base64url, la longitud de <code>r‖s</code> de ECDSA no corresponde a la curva, o falló la conversión a DER.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="Revisar la configuración del servidor emisor">
Se intentó firmar con una clave de solo verificación. En tiempo de ejecución no hay clave privada.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="Revisar el tipo de clave y la biblioteca">
La operación de firma o verificación <strong>no llegó siquiera a ejecutarse.</strong> Tipo de clave incorrecto, manejador liberado, o error interno de la biblioteca criptográfica.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="Revisar los registros">
Un error de firma que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

::: warning No mezcles la discrepancia con el fallo del backend
Ambos códigos están en ejes opuestos.

- `DAT_SIG_MISMATCH` — simplemente una firma entrante que no coincide, por tanto **sin impacto en el servicio**; en cambio, si persiste, es un caso de **sospecha**.
- `DAT_SIG_BACKEND` — la propia operación de verificación no llegó a ejecutarse: es **un problema de nuestro lado** y no un caso de sospecha.

Notificar un tipo de clave incorrecto o un fallo de la biblioteca como "discrepancia de firma" mezcla entre los indicadores de ataque una situación en la que en realidad es nuestro código el que está roto. A la inversa, una falsificación real clasificada como error de backend desaparece por completo de las métricas de sospecha.
:::

---

## Cifrado

Problemas de cifrado y descifrado de la carga útil secure.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="Bloquear la sesión, registro de seguridad">
La etiqueta de autenticación AES-GCM no coincide. O bien secure ha sido manipulado, o bien la clave del certificado es distinta.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="Rechazar la petición">
El texto cifrado no está vacío pero no supera el tamaño del IV (12 bytes), o la entrada excede el límite de la implementación (<code>INT_MAX</code>, etc.).
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="Comprobar el soporte de la plataforma">
La operación de cifrado o descifrado no pudo ejecutarse. Plataforma sin soporte de GCM, o fallo al inicializar el contexto.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="Revisar los registros">
Un error de cifrado/descifrado que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

**Una carga útil secure vacía no es un error.** Una entrada vacía produce una salida vacía y no se emite ningún código.

En la ruta que omite la verificación de firma, la etiqueta GCM es **la única comprobación de integridad**. Por eso `DAT_CRYPTO_TAG_MISMATCH` no se agrupa con los demás fallos de descifrado bajo un mismo código.

---

## Clave

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="Sustituir la clave">
La longitud de la clave no coincide con el algoritmo declarado (HMAC 32/48/64, AES 16/32), el punto no está sobre la curva, <code>d ∉ [1,n-1]</code>, el formato no es sin comprimir (0x04), o la clave privada y la pública no forman pareja.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="Cambiar de algoritmo">
Se ha solicitado una exportación de solo verificación para un algoritmo de la familia HMAC.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="Revisar los registros">
Un error de clave que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

**Tres casos que se parecen pero son distintos:**

| Código | Significado |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **Límite estructural del algoritmo.** HMAC es simétrico y no tiene concepto de clave pública |
| `DAT_SIG_KEY_MISSING` | **Estado en tiempo de ejecución.** Esta clave no contiene ahora mismo una clave privada |
| `DAT_CERT_VERIFY_ONLY` | **Forma de despliegue.** Este certificado se desplegó como de solo verificación |

---

## Gestor

El estado del objeto que guarda los certificados y se usa para emitir y verificar.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="Comprobar la conexión con el CMS">
No se dispone de ningún certificado. O bien antes de la importación, o bien tras fallar la primera sincronización con el CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="Decidir según la causa — ver la tabla siguiente">
Hay certificados, pero ninguno es utilizable para emitir en este momento. <strong>La causa se transmite junto con el error.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="Corregir el código que llama">
Se ha usado un gestor o un certificado ya liberado.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="Revisar los registros">
Un error de gestor que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

La causa (`cause`) de `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` es una de estas cuatro. **Lo que hay que hacer difiere por completo según el origen.**

| Causa | Significado | Reintento | Reacción |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Antes del inicio de la ventana de emisión | **Transitorio** | Se resuelve esperando |
| `DAT_CERT_ISSUANCE_ENDED` | Ventana de emisión cerrada, solo es posible verificar | Permanente | Hay que desplegar un certificado nuevo |
| `DAT_CERT_EXPIRED` | Todo el stock está expirado | Permanente | Hay que renovar los certificados |
| `DAT_CERT_VERIFY_ONLY` | Todo el stock es de solo verificación | Permanente | **Es un error de configuración del despliegue** |

Si el servidor emisor está configurado para recibir únicamente certificados de verificación, aparece `DAT_CERT_VERIFY_ONLY`. Esperar nunca lo resuelve, así que no es un caso de reintento.

---

## Configuración

Problemas con los valores que pasa quien llama. La familia `CONFIG` está formada íntegramente por **errores que hay que corregir en el código**; si aparecen en producción, es que el despliegue es incorrecto.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="Comprobar el nombre del algoritmo">
Nombre de algoritmo desconocido. Debe coincidir exactamente con la notación de transporte (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="Corregir el código que llama">
Un argumento obligatorio es null, está fuera del rango permitido (valor de tiempo negativo, <code>interval &lt;= 0</code>), es de un tipo no soportado (un número o un booleano como carga útil en lenguajes de tipado dinámico), o el cuerpo que se va a firmar está vacío.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="Corregir la URI">
La URI del servidor CMS no se ajusta a la especificación. No se puede analizar, el esquema no es http/https, o lleva una ruta o una cadena de consulta.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="Revisar los registros">
Un error de configuración que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

---

## Interno

Problemas del entorno de ejecución y del runtime.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="Comprobar el despliegue y la plataforma">
El backend criptográfico o la API del runtime sencillamente no existen. Falta <code>crypto.subtle</code>, la plataforma no soporta AES-GCM, o la versión del runtime es insuficiente.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="Revisar los registros">
Fallo al reservar memoria, fallo al generar aleatoriedad, fallo al adquirir un bloqueo, o se ha alcanzado una rama diseñada como inalcanzable.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` se resuelve corrigiendo el entorno de despliegue; `DAT_INTERNAL_UNKNOWN` suele ser un fallo del runtime o un error de la biblioteca.

---

## Sincronización CMS

Si no se usa la sincronización con el CMS, estos códigos no aparecen.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="Reintentar tras un backoff">
Fallo de DNS, conexión rechazada, fallo de TLS, <strong>tiempo de espera agotado</strong>. El tiempo de espera no tiene código propio y se incluye aquí: la reacción es la misma.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="Comprobar la configuración del token">
El servidor respondió 401. Falta el token o es incorrecto.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="Comprobar el nivel del token">
El servidor respondió 403. El token es válido pero no tiene permisos sobre este endpoint.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="Comprobar la configuración de la URL">
El servidor respondió 404. La URL es incorrecta.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="Reintentar tras un backoff">
El servidor respondió 5xx.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="Comprobar el código de estado">
Una respuesta no-2xx que no corresponde a ninguno de los casos anteriores.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="Comprobar la versión del servidor">
La respuesta no tiene línea de versión, la línea de versión no es decimal pura, o supera el rango.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="Revisar CERT_* / KEY_* en cause">
La respuesta llegó, pero no se pudieron aplicar los certificados. <strong>El origen se transporta en <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="Se gestiona automáticamente">
El servidor devolvió una versión anterior a la nuestra. Es la instrucción de resincronización completa.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="Esperar a la primera sincronización">
Todavía no ha habido ninguna sincronización con éxito.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
La sincronización anterior sigue en curso, por lo que se ha saltado este ciclo. No es un error.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="Comprobar las opciones de compilación">
La funcionalidad CMS no está incluida en la compilación. Feature desactivada o CURL ausente.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="Revisar los registros">
Un error de CMS que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

Los códigos en los que la sincronización se considera **fallo permanente** (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`, `IMPORT_FAILED`) son todos críticos. Reintentar no resuelve nada mientras los certificados siguen expirando: si se deja sin atender, el servicio acabará necesariamente detenido.

En cambio, `UNREACHABLE` y `SERVER_ERROR` son parciales. Todo sigue funcionando con los certificados existentes y la sincronización se recupera sola en el siguiente ciclo — **pero si los fallos continúan, al final se pasa a crítico.** Coloca la alerta sobre el número de fallos consecutivos.

::: tip Los fallos de sincronización no se lanzan como excepción
Aunque falle la primera sincronización, el gestor se devuelve con normalidad: es preferible que la sincronización acabe produciéndose, aunque sea tarde. El fallo, en cambio, queda como **estado consultable**.

| Cliente | Consulta |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

Si nunca ha habido éxito, ahí figura `DAT_CMS_NOT_SYNCED`; en funcionamiento normal el valor está vacío.
:::

---

## Servidor

Códigos que emite el servidor CMS. Los clientes **no los generan, solo los reciben**.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
Falta la cabecera <code>Authorization</code>, o el token no está registrado en ningún nivel.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
El token sí está registrado, pero no en el nivel que exige este endpoint.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="Configurar un token de inmediato">
No hay ningún token configurado, por lo que la autenticación está totalmente desactivada. <strong>Con ello incluso la API de emisión de certificados queda abierta sin autenticación.</strong> No sale en la respuesta, solo se registra en el arranque.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
Los parámetros de ruta o de consulta no son interpretables, o un argumento está fuera del rango permitido (delay negativo, más de diez años, etc.).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
El nombre de algoritmo de la ruta de la petición es desconocido.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
Esa ruta no existe o el método es distinto.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
Se ha superado el tamaño del cuerpo de la petición.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
Un error de petición que no encaja en ninguna de las categorías anteriores.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="Reintentar tras un backoff">
Conexión con la base de datos perdida, pool de conexiones agotado, contención de bloqueos, tiempo de espera agotado. <strong>El único código que usa 503</strong>: la señal con la que el cliente sabe que "esto mejora esperando".
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="Comprobar el estado de la base de datos">
Fallo de lectura o escritura, tabla inexistente, esquema no coincidente, fila de certificado corrupta.
</ErrorCode>

Sobre de respuesta:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

Para los errores que surgen al crear y manipular certificados, el servidor usa tal cual los códigos comunes anteriores (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`).

### Al recibir un código del servidor

El cliente envuelve el código del servidor en su propio código `CMS` y conserva el original en `cause`.

| Recibido | HTTP | Código que emite el cliente |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (los demás) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (retroceso de versión) | 200 | `DAT_CMS_VERSION_RESET` |

---

## Buscar por síntoma

| Síntoma | Código |
| --- | --- |
| Funciona justo tras iniciar sesión y poco después se rechaza | `DAT_TOKEN_EXPIRED` — Se ha agotado la vida del token. Basta con reemitirlo |
| La verificación solo falla en un servidor concreto | `DAT_CERT_NOT_SYNCED` — Ese servidor aún no ha recibido el nuevo CID |
| El mismo token se rechaza en todos los servidores | `DAT_CERT_NOT_FOUND` — Un CID que nunca hemos emitido |
| El servidor emisor no consigue crear tokens | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **Se ha desplegado como verify-only** |
| La emisión solo falla justo después del arranque | `DAT_MANAGER_NO_CERTIFICATE` — Antes de la primera sincronización. Se resuelve en breve |
| La sincronización con el CMS falla continuamente | `DAT_CMS_UNAUTHORIZED` — El token es incorrecto. Reintentar no lo resuelve |
| No llega ni un solo certificado | `DAT_CMS_ENDPOINT_NOT_FOUND` — Hay una errata en la URL |
| Solo falla en una plataforma concreta | `DAT_INTERNAL_UNAVAILABLE` — Falta el backend criptográfico |
| Los fallos de verificación aumentan de golpe | `DAT_SIG_MISMATCH` — Aislado es inofensivo, pero **en avalancha es un intento de falsificación** |
| El descifrado de secure falla de golpe | `DAT_CRYPTO_TAG_MISMATCH` — Certificados desalineados o **intento de manipulación** |
| Aviso en el registro de arranque del CMS | `DAT_AUTH_DISABLED` — **La autenticación está apagada.** La API de emisión está abierta |

---

## Apéndice

### Sintaxis de los códigos

```
DAT_<área>_<causa>
```

- Cuando la misma causa se produce en áreas distintas, **el nombre de la causa es idéntico.** `DAT_TOKEN_MALFORMED` y `DAT_CERT_MALFORMED` solo se diferencian en el objeto; el significado es el mismo.
- `_UNKNOWN` es **exclusivamente el repliegue** de cada área. No se usa con otro sentido, como "algoritmo desconocido" (para eso está `_UNSUPPORTED`).
- La cadena del código es un contrato público. El mensaje puede cambiarse libremente; el código, no.

| Categoría | Prefijo de código |
| --- | --- |
| Token | `DAT_TOKEN_` |
| Certificado | `DAT_CERT_` |
| Firma | `DAT_SIG_` |
| Cifrado | `DAT_CRYPTO_` |
| Clave | `DAT_KEY_` |
| Gestor | `DAT_MANAGER_` |
| Configuración | `DAT_CONFIG_` |
| Interno | `DAT_INTERNAL_` |
| Sincronización CMS | `DAT_CMS_` |
| Servidor | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### Acceso según el cliente

| Cliente | Tipo de error | Código | Clase de reintento | Evento de seguridad |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| Servidor CMS | Sobre JSON | campo `code` | — | — |

`Evento de seguridad` solo devuelve `true` en los dos casos en los que la falsificación o la manipulación son seguras (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`). La etiqueta **sospecha** de este documento abarca más (llega hasta tokens, claves y peticiones manipulados); por ahora es solo una clasificación documental y no se expone en la API del cliente.

El nivel de **impacto** es igualmente una clasificación documental. Un mismo código puede golpear de forma distinta según dónde surja: `DAT_KEY_INVALID`, por ejemplo, no tiene impacto cuando sirve para filtrar un token entrante, pero hace fracasar toda la sincronización si aparece al leer un certificado durante la sincronización con el CMS.

**Las causas subyacentes no se pierden.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` y `DAT_CMS_IMPORT_FAILED` transmiten el origen mediante el encadenamiento de excepciones propio de cada lenguaje (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning C/C++ conserva también los valores enteros
Los valores enteros existentes de `dat_error_t` se mantienen por compatibilidad ABI, pero **el código de texto es el que manda**. La biblioteca ya no devuelve los valores antiguos, así que una comparación como `err == DAT_ERROR_INVALID_DAT` ya no es válida. Compara mediante `dat_error_code(e)`.

C no dispone de encadenamiento de excepciones, así que la causa se consulta aparte con `dat_manager_issuable_cause()`.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
