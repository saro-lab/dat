# Guía de programación con IA

## Ejemplo de vibe coding

```
Aplica DAT a la autenticación de sesión de este servidor web.
Es un token de acceso distribuido como JWT, y la documentación está en https://dat.saro.me/llms.txt
Léela antes de empezar. Descarga el conjunto completo de documentos llms en la carpeta docs/dat y actualiza también la documentación del agente.

- Proyecto: Java Spring Boot, usando Spring Security
- Objetivo: sustituir la sesión por DAT
- Servidor DAT-CMS: http://localhost:8088 - pásalo a las propiedades
- Algoritmo de firma: HMAC-SHA512-MFS
- Algoritmo de cifrado: IV-AES256-GCM
- Valores predeterminados para todo lo demás

No inventes APIs que no estén en la documentación.
```


## Algoritmos

### Firma

| Algoritmo | Características |
| --- |---|
| `HMAC-SHA256-MFS`<br/>`HMAC-SHA384-MFS`<br/>`HMAC-SHA512-MFS` | · Basado en hash<br/>· Clave simétrica<br/>· Rápido<br/>· [HMAC](https://en.wikipedia.org/wiki/HMAC) |
| `ECDSA-P256`<br/>`ECDSA-P384`<br/>`ECDSA-P521` | · Basado en curva elíptica<br/>· Clave asimétrica<br/>· Seguridad que se paga con velocidad<br/>· [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) |

- HMAC es abrumadoramente más rápido, así que si lo único que importa es impedir los ataques externos, HMAC es la opción recomendada.
- ECDSA, por su estructura de clave pública, permite separar el servidor de emisión de los servidores de verificación. En un sistema de gran escala donde los permisos y los roles ya están bien separados, refuerza la seguridad frente a ataques internos.

### Cifrado

| Nombre | Longitud de clave |
| --- |---|
| `IV-AES128-GCM` | 128 bits |
| `IV-AES256-GCM` | 256 bits |

- Los datos que DAT cifra son cortos, así que apenas hay diferencia medible entre 128 bits y 256 bits.
- AES prácticamente no consume recursos, por lo que se recomiendan los 256 bits para disponer de más margen de seguridad.


## Servidor DAT-CMS

**[Instalar DAT-CMS](./svc/docker-saro-lab-dat-cms)**

DAT-CMS no es obligatorio, pero se recomienda encarecidamente instalarlo cuando necesite distribuir certificados a varios servidores y automatizar la rotación de claves.

## Documentos siguientes

- [¿Qué es DAT?](./intro) - por qué se diseñó DAT
- [Especificación de DAT](./spec/dat) - el formato de transmisión del token
- [Todas las bibliotecas](./libs/) - instalación y ejemplos por lenguaje
