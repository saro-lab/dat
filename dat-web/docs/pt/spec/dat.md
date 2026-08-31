# DAT

Um DAT é uma string ASCII com campos separados por pontos (`.`). Cada campo aparece uma vez em uma ordem fixa, e a assinatura confirma que os campos anteriores foram transmitidos exatamente como foram criados.

<WireFormat
  hint="A ordem dos campos e os separadores fazem parte da especificação."
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Unix time de expiração'},
    {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID do certificado'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Bytes públicos'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Bytes criptografados'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Assinatura dos quatro campos anteriores'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Campos

| Campo | Representação | Significado |
| --- | --- | --- |
| `expire` | Decimal de um inteiro sem sinal | Unix time em que o DAT expira |
| `cid` | Hexadecimal em minúsculas de um inteiro sem sinal | ID do certificado usado para verificação |
| `plain` | Base64Url sem padding | Bytes não criptografados |
| `secure` | Base64Url sem padding | Bytes protegidos pelo algoritmo de criptografia do certificado |
| `signature` | Base64Url sem padding | Assinatura dos bytes ASCII originais de `expire.cid.plain.secure` |

`plain` faz parte do conteúdo assinado e não pode ser alterado, mas qualquer pessoa pode decodificá-lo. Segredos, dados pessoais e valores usados diretamente em decisões de autorização devem ficar em `secure`. Um `secure` vazio também é válido.

## Forma canônica

- Todo o DAT deve ser ASCII.
- Os números são representados sem sinal, espaços, prefixo ou zeros iniciais desnecessários. Somente o valor `0` é escrito como `0`.
- Base64Url usa o alfabeto URL-safe e não permite padding `=` nem espaços.
- Representações Base64Url não canônicas que expressem os mesmos bytes com strings diferentes são rejeitadas.
- Se a quantidade ou a ordem dos campos for diferente, a string não é um DAT.

Essas regras impedem que implementações distintas aceitem strings diferentes como o mesmo DAT.

## Emissão

1. Selecione um certificado que possa emitir no momento.
2. Some o TTL do certificado ao horário atual para criar `expire`.
3. Codifique `plain` como Base64Url.
4. Criptografe `secure` com o algoritmo de criptografia do certificado.
5. Assine os bytes ASCII obtidos ao unir os campos anteriores com pontos.

A emissão só é permitida no intervalo de emissão do certificado: `start <= now <= start + duration`.

## Verificação

1. Faça o parse do DAT segundo as regras canônicas.
2. Confirme que `expire > now`. Se `expire == now`, o DAT está expirado.
3. Encontre o certificado correspondente a `cid` e confirme que ele pode verificar.
4. Verifique a assinatura dos bytes originais de `expire.cid.plain.secure`.
5. Autentique e descriptografe `secure`, e devolva-o com `plain`.

As API de parse que não verificam a assinatura servem apenas para observação ou diagnóstico. Seus resultados não devem ser usados para autenticar nem conceder permissões.

## Responsabilidades fora da especificação

O DAT não define o armazenamento de usuários, o método de login, o modelo de autorização, o cabeçalho de transporte do token nem uma lista de revogação. A aplicação decide quais solicitações permite com base no payload verificado.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
