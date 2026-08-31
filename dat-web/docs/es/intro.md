# ¿Qué es DAT?

DAT (Distributed Access Token) es una especificación de token de acceso que emplean un servicio emisor y un servicio verificador compartiendo el mismo certificado. Como la verificación no necesita consultar de nuevo al servicio emisor ni a un almacén central de sesiones, permite transmitir el resultado de la autenticación con menos acoplamiento entre servicios.

<WireFormat
  hint="Los campos separados por puntos forman un DAT."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Unix time de caducidad'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID del certificado'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Datos públicos'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Datos cifrados'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Firma del contenido'},
  ]"
/>

## Componentes

### DAT

Es una cadena que un usuario o servicio envía junto con una solicitud. Incluye la fecha de caducidad y el ID del certificado, y puede contener tanto datos públicos como cifrados.

### Certificado

Contiene los algoritmos, las claves y el intervalo temporal necesarios para crear y comprobar un DAT. El ID del certificado, `cid`, no cambia; al rotar las claves se utiliza un nuevo `cid`.

### Gestor

El gestor de la biblioteca cliente almacena los certificados, crea DAT con un certificado actualmente apto para emitir y verifica cada DAT con el certificado correspondiente a su `cid`.

### DAT CMS

Es un servidor opcional que crea, almacena y entrega certificados a los servicios. Puede proporcionar certificados completos a los servicios emisores y certificados exclusivos para verificación a los servicios que solo verifican.

## Emisión y verificación

<ArchFlow
  :user="{label: 'Usuario', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Gestión de certificados', 'Sincronización basada en versiones']}"
  :service="{servers: [
    {label: 'Servicio emisor', kind: 'issuer', icon: 'login', request: 'Datos de autenticación', response: 'DAT', sync: 'Certificado completo'},
    {label: 'Servicio verificador', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Función protegida', sync: 'Certificado exclusivo para verificación'},
  ]}"
/>

El servicio emisor define los datos `plain` y `secure` y crea el DAT. El servicio verificador comprueba la caducidad, la firma y el texto cifrado antes de entregar ambas áreas de datos a la aplicación. `plain` está firmado pero no cifrado, por lo que no debe contener secretos ni datos personales.

## Por qué la verificación sigue funcionando al cambiar el certificado

Cuando un nuevo certificado pasa a estar disponible para emisión, los DAT posteriores usan su nuevo `cid`. El certificado anterior permanece disponible para verificar hasta que termine el TTL de los DAT ya emitidos. Así, la rotación de claves puede coexistir con el periodo de verificación de los tokens anteriores.

## Entornos adecuados

- Entornos donde la autenticación y la función real corresponden a servicios distintos
- Entornos donde varios runtimes emiten o verifican el mismo token
- Entornos que transmiten permisos de corta duración sin consultar una sesión central
- Entornos que necesitan separar en un mismo token la información pública de enrutamiento y los datos protegidos

DAT no define la política de autorización. Que un DAT sea válido y que la aplicación permita una solicitud son decisiones distintas.

## Documentos siguientes

- [Especificación de DAT](./spec/dat): campos del token y reglas de verificación
- [Certificados](./spec/dat-certificate): claves e intervalos temporales
- [Especificación de DAT CMS](./spec/cms): contrato de sincronización
- [Bibliotecas](./libs/): integración en una aplicación

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
