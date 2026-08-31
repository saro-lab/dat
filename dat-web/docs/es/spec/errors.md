# Códigos de error

Las implementaciones de DAT proporcionan códigos de error estables además de mensajes legibles. Los programas deben decidir su comportamiento mediante el código y la clasificación de reintento, sin comparar cadenas de mensajes.

## Cómo leerlos

```text
DAT_<área>_<causa>
```

| Prefijo | Área |
| --- | --- |
| `DAT_TOKEN_` | Cadena DAT y caducidad |
| `DAT_CERT_` | Cadena y estado del certificado |
| `DAT_SIG_` | Firma y verificación |
| `DAT_CRYPTO_` | Cifrado y descifrado |
| `DAT_KEY_` | Formato y permisos de claves |
| `DAT_MANAGER_` | Gestor de certificados |
| `DAT_CONFIG_` | Argumentos de llamada y configuración |
| `DAT_INTERNAL_` | Funciones internas del runtime |
| `DAT_CMS_` | Sincronización del cliente CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Servidor CMS |

`_UNKNOWN` se usa únicamente para los errores que no pueden clasificarse con otro código dentro de su área. La misma causa usa el mismo nombre aunque aparezca en áreas diferentes.

## Clasificación de reintentos

| Clasificación | Significado | Tratamiento |
| --- | --- | --- |
| Transitorio | Puede funcionar cuando se recupere el estado externo | Reintentar de forma limitada tras un backoff |
| Estado | Puede funcionar al cambiar la sincronización de certificados o la hora | Actualizar el estado necesario y reintentar |
| Permanente | Volver a intentarlo con la misma entrada fallará | Corregir la entrada, la configuración o el código |

## Token y certificado

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
El número de campos, los números o la representación Base64Url del DAT no cumplen la especificación. Descarta la entrada.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
La fecha de caducidad del DAT es igual o anterior a la hora actual. Se necesita un DAT nuevo.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
La estructura o la representación de los campos de la cadena del certificado es incorrecta.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
No existe un certificado para el `cid` del DAT. Comprueba el estado de sincronización de los certificados.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Es posible que el certificado necesario todavía no haya llegado al servicio. Sincroniza inmediatamente y vuelve a evaluarlo.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
La hora de inicio del certificado aún no ha llegado. Comprueba la hora del sistema y el momento de distribución del certificado.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Ha terminado el periodo durante el que se podía verificar con el certificado.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
El mismo `cid` aparece más de una vez en una única lista de importación. Se rechaza toda la importación.
</ErrorCode>

## Firma, cifrado y claves

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
La firma no corresponde al contenido. El DAT puede haber sido alterado o firmado con otra clave.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
La etiqueta de autenticación AES-GCM no coincide. Comprueba si se ha alterado el texto cifrado o si el certificado no corresponde.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
La longitud, el formato o la combinación de algoritmo de la clave no son válidos.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Se intentó emitir un DAT con un certificado exclusivo para verificación. Los servicios emisores necesitan un certificado completo.
</ErrorCode>

`DAT_SIG_MISMATCH` y `DAT_CRYPTO_TAG_MISMATCH` son errores que la API pública de eventos de seguridad clasifica como verdaderos. Una sola entrada no válida no supone una caída del servicio, pero las repeticiones deben observarse como un posible evento de seguridad.

## Gestor y configuración

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
El gestor no tiene certificados. Importa certificados o completa la sincronización con CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Hay certificados, pero ninguno completo puede emitir en este momento. Revisa en la cadena de causas la caducidad, la hora de inicio o el estado verify-only.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Un argumento de llamada o un valor de configuración está fuera del intervalo permitido.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
La función criptográfica o de red necesaria no está disponible en esta plataforma.
</ErrorCode>

## Cliente CMS

| Código | Significado | Tratamiento habitual |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Formato no válido de la URI de CMS | Corregir la configuración |
| `DAT_CMS_UNAUTHORIZED` | Fallo de autenticación | Corregir el token |
| `DAT_CMS_FORBIDDEN` | El rol no tiene permiso | Comprobar el rol del token |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | La ruta no existe o es distinta | Comprobar la dirección y la ruta de CMS |
| `DAT_CMS_NETWORK` | Fallo de conexión o transferencia | Comprobar la red y aplicar backoff |
| `DAT_CMS_TIMEOUT` | Tiempo de espera agotado | Ajustar la red y los tiempos de espera |
| `DAT_CMS_SERVER_ERROR` | Error del servidor CMS | Comprobar el servidor y aplicar backoff |
| `DAT_CMS_RESPONSE_INVALID` | Formato no válido de una respuesta correcta | Comprobar el contrato entre servidor y cliente |
| `DAT_CMS_VERSION_RESET` | La versión del servidor retrocedió | Comprobar los datos de CMS y el despliegue |
| `DAT_CMS_IMPORT_FAILED` | No se pudieron aplicar los certificados recibidos | Revisar la cadena de causas |
| `DAT_CMS_STOPPED` | Se usó un gestor ya detenido | Crear otro gestor o corregir el orden de llamadas |

Las bibliotecas cuya sincronización inicial es best-effort conservan el error en el campo del último error. Si el inicio debe fallar, usa la API de sincronización inmediata que devuelve o lanza el error directamente.

## Servidor CMS

| Código | HTTP | Significado |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | El token no existe o no es válido |
| `DAT_AUTH_FORBIDDEN` | 403 | El rol del token no corresponde al permiso solicitado |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Nombre de algoritmo no compatible |
| `DAT_REQ_NOT_FOUND` | 404·405 | La ruta o el método no coinciden |
| `DAT_REQ_TOO_LARGE` | 413 | Código reservado para superar el límite del cuerpo de la solicitud |
| `DAT_STORE_UNAVAILABLE` | 503 | El almacén no está disponible temporalmente |
| `DAT_STORE_UNKNOWN` | 500 | Error no clasificado al procesar el almacén |

Actualmente, los clientes no exponen literalmente el código del servidor incluido en un JSON no 2xx: convierten el estado HTTP en un código `DAT_CMS_*`. Por ello, el código del registro del servidor y el del error del cliente pueden diferir.

## Consulta por lenguaje

| Entorno | Código de error | Clasificación de reintento |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Los errores con una causa subyacente pueden inspeccionarse mediante la cadena de excepciones o la API de consulta de causas de cada lenguaje.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
