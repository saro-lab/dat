# Programación vibe con IA

Puedes integrar DAT con mayor facilidad si explicas a la IA tu proyecto actual y el comportamiento que deseas. En los ejemplos siguientes, sustituye únicamente la dirección y los nombres de las variables de entorno por los de tu proyecto.

## Implementación sencilla

Utiliza esta petición cuando quieras crear rápidamente la estructura básica.

```text
Uso Kotlin y Spring Boot.
Añade autenticación DAT a Spring Security.

Primero lee https://dat.saro.me/llms.txt y consulta
la especificación de DAT y el uso de la biblioteca oficial.

Verifica el Bearer token del encabezado Authorization y,
si la autenticación tiene éxito, añade la información del usuario a SecurityContext.

Este servidor no emite DAT; solo los verifica.
Debe obtener de DAT CMS certificados exclusivos para verificación.

Busca primero en el proyecto la dirección del servidor CMS y la configuración del token.
Si no las encuentras, pregúntame. No inventes valores.

Usa la biblioteca oficial de DAT para Java/Kotlin e impleméntalo
de acuerdo con la estructura y el estilo de código del proyecto.
```

## Implementación detallada

Utiliza esta petición cuando quieras especificar con precisión el método de autenticación y el tratamiento de errores.

```text
Este proyecto usa Kotlin, Spring Boot y Spring Security.
Revisa la configuración de seguridad actual y añade autenticación DAT.

Primero lee https://dat.saro.me/llms.txt y consulta
la especificación de DAT, el método de sincronización de certificados y la API de la biblioteca oficial.

Las condiciones de implementación son las siguientes.

- Lee el DAT del encabezado Authorization: Bearer.
- Si no hay DAT, continúa como una solicitud anónima.
- Si el DAT no es válido o ha caducado, responde con 401.
- Si la verificación tiene éxito, añade el ID y los permisos del usuario a SecurityContext.
- Lee de plain únicamente los valores que pueden ser públicos.
- Lee el ID y los permisos del usuario de los datos secure ya verificados.
- Este servidor solo verifica, por lo que debe usar certificados verify-only de DAT CMS.
- Recibe la dirección de CMS y el token mediante variables de entorno.
- Si la sincronización de certificados falla al iniciar, impide también el inicio de la aplicación.
- Durante la ejecución, actualiza automáticamente los certificados y cierra el gestor al terminar.
- Distingue la causa del fallo por el código de error DAT, no por el mensaje.
- No registres el DAT original, el token de CMS ni datos personales.

Primero revisa la configuración de Spring Security del proyecto y su estructura de usuarios y permisos.
Si no puedes determinar la dirección de CMS, las variables de entorno del token o el formato de los datos secure, pregunta antes de implementar.
Usa únicamente la API pública de la biblioteca oficial de DAT para Java/Kotlin.

Antes de modificar el código, explica brevemente el flujo de autenticación y los archivos que cambiarás.
```

## ¿Qué ejemplo elegir?

- Si quieres empezar con código que se pueda ejecutar, usa **Implementación sencilla**.
- Si necesitas un flujo de autenticación para un entorno de producción, usa **Implementación detallada**.

Si la IA hace preguntas, empieza por indicar la dirección de CMS, el nombre de la variable de entorno que contiene el token y la información del usuario incluida en `secure`.
