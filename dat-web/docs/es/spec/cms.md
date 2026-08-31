# DAT CMS

DAT CMS es un servicio opcional que crea, almacena y entrega certificados a los gestores cliente. Este documento describe el contrato de sincronización entre el cliente y el servidor. Para la instalación y operación, consulta la [guía del servicio DAT CMS](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Sincronización de certificados"
  :actors="[
    {id: 'client', label: 'Cliente', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Solicitud de la versión actual y los certificados', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Respuesta con la versión y los certificados', kind: 'res'},
    {from: 'client', label: 'Validación completa y aplicación atómica', kind: 'note'},
  ]"
/>

## Endpoints por función

| Función | Ruta | Uso |
| --- | --- | --- |
| Obtener certificados completos | `GET /v1/certs?version=<n>` | Servicios que emiten DAT |
| Obtener certificados exclusivos para verificación | `GET /v1/certs/verify-only?version=<n>` | Servicios que solo verifican y descifran |
| Registrar un certificado | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Operador o tarea de generación de certificados |

Las consultas completas y exclusivas para verificación pueden protegerse con roles de token distintos. Configura la opción `verifyOnly` del gestor cliente para impedir que un servicio exclusivo para verificación solicite certificados completos.

## Cursor de versión

El cliente envía al servidor la última versión que aplicó. Si el estado del servidor no ha cambiado, no es necesario volver a enviar los certificados. Si hay un estado nuevo, la respuesta contiene la versión en la primera línea y los certificados desde la segunda.

Si una respuesta correcta contiene solo la versión y ningún certificado, se conservan los certificados y el emisor existentes. Una respuesta cuya versión del servidor sea inferior a la del cliente se trata como un error sin revertir el estado.

## Reglas de aplicación de certificados

- Si una respuesta repite el mismo `cid`, se rechaza la respuesta completa.
- Si el `cid` de la respuesta coincide con uno ya disponible, se conserva el certificado existente.
- El estado se aplica de una vez después de analizar y validar todos los certificados.
- No se deja un estado en el que solo se hayan aplicado algunos certificados.
- Se selecciona como emisor un certificado completo adecuado entre los que pueden emitir en el momento actual.

## Sincronización inicial y manual

La primera sincronización al crear el gestor cliente suele ser best-effort. Aunque falle, se crea el gestor y se conserva el último error concreto. Si el inicio de la aplicación debe fallar, llama a la API de sincronización inmediata de la biblioteca para devolver el error al llamador.

Un entorno que no usa sincronización automática puede desactivar el interval y sincronizar manualmente cuando sea necesario. Si se usa sincronización automática, cierra o detén el gestor al finalizar la aplicación.

## Red y errores

Configura los tiempos de espera de conexión y de la solicitud completa para el entorno operativo. Como la política de redirección varía según el runtime, consulta la documentación de la biblioteca. Actualmente, las respuestas CMS que no son 2xx se clasifican como errores `DAT_CMS_*` según el estado HTTP, sin conservar literalmente el código de error detallado del JSON del servidor.

Durante un fallo temporal del almacén, el servidor puede proporcionar la última instantánea de certificados obtenida correctamente. Si aún no existe una instantánea correcta, responde con `DAT_STORE_UNAVAILABLE`.

## Documentación del servicio

La implementación, la base de datos, los tokens de acceso y la configuración de ejecución se describen en la [guía del servicio DAT CMS](../svc/docker-saro-lab-dat-cms).

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
