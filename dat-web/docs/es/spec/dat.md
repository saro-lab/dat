# DAT

Un DAT es una cadena ASCII con campos separados por puntos (`.`). Cada campo aparece una vez en un orden fijo, y la firma confirma que los campos anteriores se han transmitido exactamente como fueron creados.

<WireFormat
  hint="El orden de los campos y los separadores forman parte de la especificación."
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Unix time de caducidad'},
    {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID del certificado'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Bytes públicos'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Bytes cifrados'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Firma de los cuatro campos anteriores'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Campos

| Campo | Representación | Significado |
| --- | --- | --- |
| `expire` | Decimal de un entero sin signo | Unix time en que caduca el DAT |
| `cid` | Hexadecimal en minúsculas de un entero sin signo | ID del certificado que debe verificarlo |
| `plain` | Base64Url sin padding | Bytes sin cifrar |
| `secure` | Base64Url sin padding | Bytes protegidos con el algoritmo de cifrado del certificado |
| `signature` | Base64Url sin padding | Firma de los bytes ASCII originales de `expire.cid.plain.secure` |

`plain` forma parte del contenido firmado, por lo que no se puede alterar, pero cualquiera puede decodificarlo. Los secretos, los datos personales y los valores que intervienen directamente en decisiones de autorización deben ir en `secure`. Un `secure` vacío también es válido.

## Forma canónica

- El DAT completo debe ser ASCII.
- Los números se expresan sin signo, espacios, prefijo ni ceros iniciales innecesarios. Solo el valor `0` se escribe como `0`.
- Base64Url usa el alfabeto URL-safe y no admite padding `=` ni espacios.
- Se rechazan las representaciones Base64Url no canónicas que codifiquen los mismos bytes mediante cadenas diferentes.
- Si el número o el orden de los campos es distinto, no es un DAT.

Estas reglas evitan que diferentes implementaciones acepten cadenas distintas como si fueran el mismo DAT.

## Emisión

1. Selecciona un certificado actualmente apto para emitir.
2. Suma el TTL del certificado a la hora actual para crear `expire`.
3. Codifica `plain` como Base64Url.
4. Cifra `secure` con el algoritmo de cifrado del certificado.
5. Firma los bytes ASCII obtenidos al unir con puntos los campos anteriores.

La emisión solo es posible dentro del intervalo de emisión del certificado: `start <= now <= start + duration`.

## Verificación

1. Analiza el DAT conforme a las reglas canónicas.
2. Comprueba que `expire > now`. Si `expire == now`, el DAT ha caducado.
3. Busca el certificado correspondiente a `cid` y comprueba que sea apto para verificar.
4. Verifica la firma de los bytes originales de `expire.cid.plain.secure`.
5. Autentica y descifra `secure`, y devuélvelo junto con `plain`.

Las API de análisis que no verifican la firma se usan únicamente para observación o diagnóstico. Sus resultados no deben emplearse para autenticar ni conceder permisos.

## Responsabilidades fuera de la especificación

DAT no define el almacén de usuarios, el método de inicio de sesión, el modelo de autorización, el encabezado de transporte del token ni una lista de revocación. La aplicación decide qué solicitudes permite a partir del payload verificado.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
