# Sincronización con el CMS y operación de los certificados

## 1. Descripción general

El **DAT CMS (Certificate Management Service)** es el servidor que crea y distribuye los certificados que compartirá todo el clúster.

Cada aplicación recibe periódicamente la lista de certificados a través del cliente CMS (`DatCmsManager`), y esa sincronización es la que **automatiza la rotación de claves**. Aunque el operador no sustituya las claves manualmente, los certificados se crean de nuevo según un ciclo establecido y los antiguos expiran por sí solos.

<ArchFlow
    :user="{label: 'Usuario', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Crea certificados por periodo de validez', 'Limpia los caducados']}"
    :service="{servers: [
        {label: 'Servidor de inicio de sesión', kind: 'issuer', icon: 'login',
         request: 'Solicitud de inicio de sesión', response: 'Emite un DAT con el certificado', sync: 'Sync de certificados de emisión'},
        {label: 'Servidores de contenido', kind: 'verifier', icon: 'apps',
         request: 'Solicitud de contenido con DAT', response: 'Verifica el DAT y responde', sync: 'Sync de certificados de verificación'},
    ]}"
/>

Solo el servidor de inicio de sesión recibe certificados con los que puede emitir; los servidores de contenido reciben certificados de solo verificación. **Un servidor de contenido solo necesita conocer el CMS y no necesita conocer el servidor de inicio de sesión.**

---

## 2. Protocolo de sincronización

### 2.1. Solicitud y respuesta

<FlowDiagram
    title="Un ciclo de sincronización"
    :legend="{req: 'Solicitud', res: 'Respuesta', sync: 'Sincronización de certificados'}"
    :actors="[
        {id: 'app', label: 'Aplicación', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: 'version en su poder = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: token)', kind: 'req'},
        {from: 'cms', label: 'version del servidor = M, selecciona los certificados posteriores a N', kind: 'note'},
        {from: 'cms', to: 'app', label: 'línea 1: M / líneas siguientes: lista de certificados', kind: 'res'},
        {from: 'app', label: 'Si la lista está vacía, mantiene su version y termina', kind: 'note'},
        {from: 'app', label: 'version = M solo si import(clear = true) tiene éxito', kind: 'note'},
    ]"
/>

| Endpoint | Uso |
| --- | --- |
| `GET /v1/certs?version=N` | Certificados completos (incluida la clave privada de firma) |
| `GET /v1/certs/verify-only?version=N` | Certificados solo de verificación |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | El mismo contenido en formato JSON |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | Creación manual de un certificado (requiere el token Master) |
| `GET /health` | Comprobación de estado |

El cuerpo de la respuesta es texto plano en el que **la primera línea es la version actual del servidor** y, a partir de la línea siguiente, aparece un certificado por línea.

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. Cursor de versión

El cliente recuerda la última version que procesó correctamente y la envía en la siguiente solicitud. El servidor selecciona y devuelve únicamente los certificados más recientes que ese valor.

* Si la version del cliente es **anterior a la del servidor** → se devuelven solo los certificados creados a partir de ese punto.
* Si la version del cliente es **posterior a la del servidor** (sustitución del servidor, reinicialización de la base de datos, etc.) → el cursor vuelve a `0` y se devuelve **el conjunto completo**.
* El cliente **solo avanza la version cuando la importación se ha realizado con éxito.** Así se evita que el cursor avance con una respuesta fallida y se pierdan certificados de forma permanente.

::: tip Es una solicitud incremental, pero la respuesta sustituye el conjunto completo
`?version=N` significa "dame los cambios posteriores a N", pero el cliente **no fusiona la lista recibida con la que ya tiene, sino que la sustituye (clear = true)**. Esto es así porque el servidor siempre determina y entrega el conjunto completo de certificados válidos, y gracias a este método los certificados revocados en el CMS no permanecen en el cliente.
:::

### 2.3. Tokens de autenticación

El CMS divide el acceso en tres tipos de token.

| Token | Permisos |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

Como norma, a los servidores que solo verifican se les entrega únicamente el token Verify Cert. No obstante, la clave de cifrado también se incluye en la respuesta verify-only, así que revise además las advertencias del documento [{{t('menu_spec_cert')}}](./dat-certificate#_5-exportacion-verify-only) para entender lo que eso implica.

---

## 3. Retraso de emisión del certificado (delay)

Si un certificado recién creado se usa inmediatamente para emitir, otro nodo que aún no se haya sincronizado no podrá verificar los tokens firmados con él. El **retraso de emisión** es el valor que elimina esa ventana de riesgo.

<CertTimeline
    title="Qué hace la fase de retraso"
    caption="Durante la fase de retraso todos los nodos recogen el certificado, y solo después comienza la emisión."
    :marks="['Creación', 'Inicio de emisión', 'Fin de emisión', 'Expiración final']"
    :phases="[
        {label: 'Retraso de emisión', weight: 1.2, kind: 'delay', note: 'Espera a que se sincronicen todos los nodos'},
        {label: 'Emisión disponible', weight: 3, kind: 'issue', note: 'Emisión + verificación'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Solo verificación'},
    ]"
/>

Supongamos, por ejemplo, que el CMS crea el certificado A y que los servidores 1 y 2 se sincronizan cada 60 segundos. Si el servidor 1 lo recibe primero y emite un DAT con A mientras el servidor 2 todavía no lo ha recibido, el servidor 2 no podrá verificar ese DAT.

Si el retraso se fija en 180 segundos, el certificado permanece en estado no emisible durante los 180 segundos siguientes a su creación, y en ese intervalo todos los servidores completan la sincronización de forma segura. Teniendo en cuenta posibles fallos de red temporales, se recomienda establecer un valor **al menos 3 o 4 veces mayor que el intervalo de sincronización de cada servidor**.

---

## 4. Comportamientos intencionados

Todos los comportamientos siguientes **forman parte del diseño** y no son defectos. Se documentan porque en producción pueden parecer distintos de lo esperado.

### 4.1. Se sigue firmando con el certificado en caché aunque la ventana de emisión se haya cerrado

La aplicación sigue utilizando el certificado de emisión que eligió en el momento de la sincronización y no vuelve a comprobar `issuable()` en cada emisión.

**Motivo:** si la ventana de emisión se cierra mientras la conexión con el CMS está caída, con el enfoque de recomprobación **todos los inicios de sesión del servicio se detendrían en ese instante**. DAT ha optado por "seguir emitiendo aunque no se haya podido recibir un certificado nuevo".

**Contrapartida:** si el fallo de red se prolonga, pueden seguir saliendo tokens firmados con un certificado cuya ventana de emisión ya pasó. Aun así, esos tokens se verifican correctamente en los demás nodos hasta la expiración final del certificado, de modo que se consideró un compromiso preferible a que el servicio se caiga durante una incidencia.

### 4.2. Se descartan los certificados renovados con el mismo CID

Si llega un certificado con el mismo CID que uno ya en posesión, **se ignora el que acaba de llegar**.

**Motivo:** el CID es el identificador inmutable del certificado. Si un mismo CID apuntase a claves distintas, no se sabría con qué clave debe verificarse un token ya emitido que sigue circulando.

::: warning La sustitución de claves siempre con un CID nuevo
Si distribuye un certificado cambiando solo la clave pero manteniendo el mismo CID, **el cambio no se reflejará nunca en el cliente y tampoco se producirá ningún error**. Cuando sustituya una clave, emita un certificado con un CID nuevo.
:::

### 4.3. Si no hay certificados nuevos, se conserva la lista existente

Si la respuesta no contiene ningún certificado, el cliente **deja su lista tal como está**. No la vacía.

**Motivo:** si en el peor momento —cuando el servidor de certificados está caído o la respuesta es anómala— se vaciaran los certificados en posesión, **todas las verificaciones de token fallarían** de inmediato. Si no llega nada nuevo, es más seguro aguantar con lo que ya se tenía.

### 4.4. El modo SINGLE_NODE crea un certificado en cada arranque

Si se ejecuta el CMS en modo de nodo único, **crea un certificado en cada arranque**, exista o no un certificado emisible.

**Motivo:** el modo de nodo único es una configuración pensada para levantar el CMS de forma autónoma sin infraestructura adicional. Debe haber un certificado emisible disponible justo después del arranque.

**Atención:** si los reinicios se repiten, los certificados se van acumulando. Aun así, cada certificado queda fuera de la lista una vez pasado su momento de expiración, por lo que no crecen indefinidamente.

### 4.5. Si no hay ningún certificado emisible, la emisión es inmediata y sin retraso

Si en el momento de crear un certificado no existe ninguno que sea emisible, el CMS **se salta la fase de retraso** y suma ese tiempo de retraso al período de emisión.

**Motivo:** respetar el retraso implicaría que durante ese tiempo todo el clúster no pudiera emitir ni un solo token. En el primer arranque o en la recuperación de una caída total debe ser posible emitir de inmediato. En ese caso queda una advertencia en el registro del servidor.

---

## 5. Retirada y expiración de los certificados

* El certificado permanece en la lista de distribución **hasta el momento de su expiración final (`start + duration + ttl`)**. No desaparece nada más cerrarse la ventana de emisión.
* Un DAT emitido justo antes del cierre de la ventana de emisión sigue vivo durante su TTL, de modo que un servidor verificador que arranque por primera vez después de ese momento también puede recibir el certificado y verificar dicho token.
* Los certificados que superan su expiración final quedan fuera de la lista y, en la posterior tarea de limpieza, se eliminan también del almacenamiento.

---

## 6. Despliegue

Las opciones de ejecución del servidor CMS, los métodos de despliegue con Docker, Kubernetes o binario y las variables de entorno se tratan en un documento aparte.

- [Guía de despliegue de {{t('menu_svc_cms')}}](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
