# Certificados

Um certificado DAT representa em uma única string o intervalo de tempo, os algoritmos e as chaves necessários para emitir e verificar tokens.

<WireFormat
  hint="Um certificado também contém campos ASCII separados por pontos em uma ordem fixa."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID imutável do certificado'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Início da emissão'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Período apto a emitir'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Duração do DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Algoritmo de assinatura'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Algoritmo de criptografia'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Chave de assinatura ou verificação'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Chave de criptografia'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Intervalo de tempo

<CertTimeline />

- O certificado pode emitir DAT de `start` até `start + duration`, incluindo os dois horários.
- Um DAT emitido permanece válido por `ttl` a partir do momento da emissão.
- O certificado é necessário para verificação até `start + duration + ttl`. Ele também pode verificar exatamente nesse momento.

Se o certificado for removido assim que o período de emissão terminar, os DAT já emitidos não poderão ser verificados. O gerenciador e o CMS tratam separadamente a capacidade de emitir e a capacidade de verificar.

## ID do certificado e rotação de chaves

`cid` é o contrato público que identifica as chaves e o intervalo de tempo. Nunca substitua as chaves de um `cid` existente por outras. Para rotacionar as chaves, crie um novo certificado e use um novo `cid`. Os serviços sincronizam o novo certificado antecipadamente e removem o anterior somente depois que todos os DAT emitidos com ele expirarem.

## Algoritmos de assinatura

| Nome | Uso | Certificado exclusivo para verificação |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Não suportado |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Não suportado |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Não suportado |
| `ECDSA-P256` | ECDSA P-256 | Suportado |
| `ECDSA-P384` | ECDSA P-384 | Suportado |
| `ECDSA-P521` | ECDSA P-521 | Suportado |

O HMAC usa a mesma chave para assinar e verificar. Portanto, fornecer a chave a um servidor verificador também permite que ele emita. Em ambientes que precisam separar a permissão de emissão, use ECDSA e certificados exclusivos para verificação.

## Algoritmos de criptografia

| Nome | Chave |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Os nomes dos algoritmos fazem parte do contrato wire. Não os substitua pelos aliases usados no JWT.

## Certificados completos e exclusivos para verificação

Um certificado ECDSA completo contém a chave privada necessária para assinar. Um certificado exclusivo para verificação mantém apenas a chave pública ECDSA, mas conserva a chave AES necessária para descriptografar `secure`. Portanto, um serviço exclusivo para verificação pode conferir e descriptografar DAT, mas não pode emitir novos DAT.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
