
# DAT (Distributed Access Token)

---

## Por qué nació DAT

Hoy en día muchos sistemas adoptan JWT, pero en los entornos reales de producción existen las siguientes limitaciones estructurales.<br/>
Para resolverlas se diseñó DAT, una nueva especificación de token.

#### 🧩 Fragmentación de la especificación de seguridad y falta de obligatoriedad
JWT ofrece estándares de cifrado como JWE, pero su uso no es obligatorio. <br/>
Por ello, en muchos entornos de desarrollo se omite el cifrado o se transmiten los datos mediante métodos no estándar, lo que genera vulnerabilidades de seguridad.

#### 🔑 Riesgo de seguridad por el uso de claves fijas (Static Key)
La rotación de las claves de firma (Key Rolling) no es obligatoria, por lo que es frecuente utilizar una única clave durante largos períodos. Esto puede conducir al colapso de la seguridad de todo el sistema si la clave se ve comprometida y, de hecho, ya se han producido incidentes de este tipo en grandes sitios de comercio electrónico.

#### 📉 Degradación del rendimiento por la sobrecarga
JWT realiza un proceso de análisis JSON en cada solicitud y consume recursos de CPU considerables. En entornos que exigen alto rendimiento, este coste de análisis puede convertirse en el cuello de botella global del sistema.

---

## La filosofía central de DAT

DAT se diseñó bajo el principio de que la seguridad no debe ser opcional sino obligatoria, y de que el rendimiento no es negociable.

#### ⚡ Ligero y rápido

<WireFormat
    hint="Pase el cursor sobre cada campo para ver su descripción."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de expiración. Lo impone la especificación y no se puede omitir.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID del certificado que se usará para la verificación.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Datos que se hacen públicos al cliente.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Datos cifrados. No se pueden leer sin el certificado.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Firma sobre los cuatro campos anteriores.'},
    ]"
/>

Tal como se muestra arriba, DAT solo tiene cinco campos fijos separados por puntos (`.`). Como la posición de cada campo está fijada por la especificación, basta con localizar los separadores para recortar cada valor, sin ningún análisis JSON.

#### 🔐 Seguridad impuesta

DAT separa físicamente el área en texto plano (Plain) y el área **cifrada (Secure)** durante la transmisión de datos.<br/>
Obliga a que la información sensible se cifre siempre, y todo el proceso queda protegido por los algoritmos estándar declarados en el certificado (ECDSA, AES-GCM, etc.).

El algoritmo de cifrado **lo decide el certificado**, no el token. Como el token no contiene información sobre el algoritmo, no existe la superficie de ataque de confusión de algoritmos derivada de la cabecera `alg` de JWT.

#### 🔄 Rotación de claves impuesta

El certificado DAT no solo gestiona la emisión y la expiración de los tokens, sino directamente **el ciclo de vida de las claves**.<br/>
En el certificado está grabado, a nivel de especificación, "desde cuándo y hasta cuándo se puede emitir", de modo que una vez transcurrido ese período ya no se pueden crear tokens nuevos con ese certificado. Estructuralmente no puede darse la situación de que, por descuido del administrador, se utilice una misma clave durante años.

#### ⏱️ Separación entre la ventana de emisión y el período de validez

"El período durante el cual un certificado puede emitir tokens" y "el período durante el cual vive un token ya emitido" son valores distintos.<br/>
Gracias a ello, aunque el certificado deje de emitir, los tokens que ya salieron pueden agotar su propia vida, y mientras tanto el clúster pasa de forma natural al siguiente certificado.

---

## Comparación de mecanismos de autenticación

| Aspecto | **DAT**                       | **JWT** | **Sesión**           |
| --- |-------------------------------| --- |---------------------------|
| **Método de autenticación** | **Verificación distribuida**                     | Verificación distribuida | Centralizado          |
| **Estructura de datos** | **Raw Bytes<br/>(basada en desplazamientos fijos)** | JSON<br/>(texto basado en clave-valor) | Serialized Object<br/>(serialización de objetos) |
| **Mecanismo de análisis** | **Mapeo inmediato de los datos en bytes**            | Requiere análisis JSON y conversión de tipos | Deserialización de objetos y E/S |
| **Rendimiento de procesamiento** | **El más alto (sobrecarga de análisis mínima)**          | Medio (depende del rendimiento del procesamiento JSON) | Bajo (E/S de red y de disco)         |
| **Cifrado** | **Integrado de serie**                     | Requiere implementar JWE por separado (complejo) | No aplica                     |
| **Gestión de claves** | **Rotación impuesta por el sistema (seguridad obligatoria)**         | Implementación propia (riesgo de gestión descuidada) | No aplica                     |
| **Validez de la clave** | **Declarada de forma obligatoria dentro de la especificación de la clave**              | Opcional (permanente si no se gestiona) | Gestionada por el servidor central                  |
| **Selección del algoritmo** | **La decide el certificado (no está en el token)**          | `alg` de la cabecera del token | No aplica                     |
| **Momento de expiración** | **Campo obligatorio por especificación**                 | Claim opcional (`exp`) | Lo gestiona el servidor                   |

---

## {{t('bench_title')}} {#performance}

<BenchBars />

---

## Documentos siguientes

- [{{t('menu_spec_dat')}}](./spec/dat) — formato de transmisión del token y reglas canónicas
- [{{t('menu_spec_cert')}}](./spec/dat-certificate) — estructura del certificado, algoritmos y ciclo de vida
- [{{t('menu_spec_cms')}}](./spec/cms) — distribución de certificados y comportamientos que conviene conocer en producción

<script setup lang="ts">
import {useTranslate} from "../.vitepress/src/langs";
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import BenchBars from "../.vitepress/ui/BenchBars.vue";
const {t} = useTranslate();
</script>
