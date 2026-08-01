# DAT (Distributed Access Token)

## 1. Visão geral

À medida que o número de usuários conectados simultaneamente aumenta, o número de sessões (Session) também cresce, gerando uma carga excessiva no servidor de sessões.

O **DAT** é uma especificação de token concebida para resolver esse problema de sobrecarga do servidor de sessões e implementar uma autenticação eficiente que não compartilha estado entre servidores (Stateless).

O DAT é uma string composta por **5 campos fixos** separados por ponto (`.`). É possível recortar cada campo apenas pela posição dos separadores, sem análise JSON, e o momento de expiração e a região criptografada fazem parte da própria especificação.

---

## 2. Formato wire

<WireFormat
    title="Formato wire do DAT"
    hint="Passe o mouse sobre cada campo para ver a descrição."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de expiração do token. Inteiro decimal em segundos de Unixtime.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID do certificado a ser usado na verificação. Representado em hexadecimal minúsculo.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Dados expostos ao cliente. Qualquer um pode decodificá-los.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Dados criptografados. Estrutura IV(96bit) + texto cifrado AES-GCM; se estiver vazio, é uma string vazia.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Assinatura sobre os quatro campos anteriores por inteiro. É este campo que bloqueia adulteração e falsificação.'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| Campo | Tipo | Codificação | Observação |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | string decimal | Unixtime (segundos) |
| `CID` | uint64 | string hexadecimal | ID do certificado |
| `{{t('dat_plain')}}` | Binary | Base64Url (sem padding) | Dados públicos |
| `{{t('dat_secure')}}` | Binary | Base64Url (sem padding) | Dados criptografados |
| `{{t('sig')}}` | Binary | Base64Url (sem padding) | Assinatura |

<Struct type="dat" />

### 2.1. Especificação detalhada por campo

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Representa o momento de expiração do token como um inteiro de 64 bits sem sinal, em segundos (Seconds).
- **Somente dígitos decimais puros são aceitos.** Sinal, espaço ou separador incluídos são erro de formato.

`CID` : Hex (uint64)
- É o ID do certificado (Certificate ID) usado na verificação do token.
- **Somente dígitos hexadecimais puros são aceitos**, e o prefixo `0x` não é usado.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Contém os dados a serem expostos ao cliente. Suporta não apenas strings, mas também dados binários, e o cliente pode decodificá-los e conferi-los.
- **Não é criptografado.** Não devem ser colocados valores sensíveis aqui.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Contém os dados a serem mantidos privados em relação ao cliente. Estão criptografados com o algoritmo de criptografia do certificado, de modo que um cliente sem o certificado não consegue descriptografar o conteúdo.
- Sua estrutura interna é `IV(96bit) + texto cifrado`, e o IV é gerado novamente a cada criptografia.

`{{t('sig')}}` : Base64Url (Binary)
- É o dado de assinatura para verificar adulteração e falsificação do token. É gerado assinando os campos anteriores com o algoritmo de assinatura do certificado.
- Nenhum campo de um token cuja verificação de assinatura falhou deve ser considerado confiável.

---

## 3. Regras canônicas (Canonical Rules)

Para que clientes implementados em várias linguagens **interpretem o mesmo token da mesma forma**, as regras abaixo não podem divergir entre implementações. A implementação de referência é o Rust (`dat-rust`), e todas as demais implementações estão alinhadas a essas regras.

### 3.1. Análise dos campos numéricos

`expire` e `cid` são interpretados **de forma estrita**. Todas as entradas abaixo são rejeitadas como erro de formato.

| Exemplo de entrada | Resultado | Motivo |
| --- | --- | --- |
| `100` | aceito | decimal puro |
| `007` | aceito | zeros à esquerda são permitidos |
| `+100` | rejeitado | sinal não é permitido |
| `-1` | rejeitado | sinal não é permitido |
| `" 100 "` | rejeitado | espaço não é permitido |
| `1_0` | rejeitado | separador não é permitido |
| `0x10` | rejeitado | prefixo não é permitido |
| `zzzz` | rejeitado | não é número |
| `""` | rejeitado | string vazia |
| `18446744073709551616` | rejeitado | fora do intervalo de uint64 |

::: warning Por que é preciso ser estrito
Um analisador permissivo converte `-1` no valor máximo de uint64, criando um **token que na prática nunca expira**, ou transforma silenciosamente valores não numéricos em `0`. Se a permissividade variar entre implementações, o mesmo token passa em uma e é rejeitado em outra, quebrando a interoperabilidade.
:::

### 3.2. Determinação da expiração

**O token DAT e o certificado têm limites de expiração diferentes.** Não os confunda.

| Alvo | Condição de validade | No instante exato da expiração (`expire == now`) |
| --- | --- | --- |
| **Token DAT** | `expire > now` | **rejeitado como expirado** |
| **Certificado** | `expire >= now` | **ainda válido** |

O token torna-se inválido no exato momento em que chega o instante de expiração, enquanto o certificado permanece válido até esse instante. Isso porque o certificado precisa viver um tique a mais do que o token para conseguir verificar os tokens emitidos na fronteira.

### 3.3. Payload secure vazio

Se não houver dados a criptografar, `secure` é uma **string vazia**.

- `encrypt(entrada vazia)` → saída vazia (não são adicionados nem IV nem tag GCM)
- `decrypt(entrada vazia)` → saída vazia
- Se não estiver vazio, mas tiver tamanho menor ou igual ao do IV (12 bytes), é **erro de descriptografia**.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ token normal com a posição de secure vazia
```

---

## 4. Emissão e verificação

<FlowDiagram
    title="DAT: emissão → entrega → verificação"
    :legend="{req: 'Requisição', res: 'Resposta', sync: 'Sincronização de certificados'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Servidor de emissão', kind: 'issuer'},
        {id: 'client', label: 'Cliente', kind: 'client'},
        {id: 'verifier', label: 'Servidor de verificação', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: 'Distribuição de certificados', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: 'Distribuição de certificados', kind: 'sync'},
        {from: 'client', to: 'issuer', label: 'Login', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'Emissão do DAT', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'Requisição com DAT anexado', kind: 'req'},
        {from: 'verifier', label: 'Busca do certificado pelo CID → verificação da assinatura → descriptografia', kind: 'note'},
        {from: 'verifier', to: 'client', label: 'Resposta', kind: 'res'},
    ]"
/>

### 4.1. Procedimento de emissão

1. Entre os certificados que o gerenciador possui, escolhe-se um certificado **apto a emitir (issuable)**.
2. Calcula-se `expire = now + dat_ttl_seconds`.
3. Codifica-se `plain` em Base64Url e, para `secure`, criptografa-se e depois codifica-se em Base64Url.
4. Assina-se a string `expire.cid.plain.secure` e anexa-se o resultado como último campo.

### 4.2. Procedimento de verificação

1. Divide-se em 5 campos pelo ponto (`.`). Se a quantidade de campos for diferente, é erro de formato.
2. Verifica-se `expire`. Um token expirado é rejeitado antes da verificação da assinatura.
3. Busca-se o certificado pelo `cid`. Se não existir, a verificação é impossível.
4. Verifica-se a assinatura sobre o trecho `expire.cid.plain.secure`.
5. Somente após o sucesso da verificação é que `secure` é descriptografado.

::: danger Não confie em valores anteriores à verificação da assinatura
Algumas implementações fornecem APIs que extraem os campos sem conferir a assinatura (do tipo `parse without verify`). Esses valores são **inteiramente manipuláveis por um atacante** e devem ser usados apenas para fins de log e depuração.
:::

---

## 5. Comparação com o JWT

O DAT e o JWT (JSON Web Token) compartilham a estrutura de token separada por ponto (`.`) e o método de verificação por assinatura, mas apresentam as seguintes diferenças fundamentais no design interno.

### 5.1. Comparação das diferenças estruturais

* **Estrutura JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Estrutura DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. Principais diferenças

* **Leveza baseada em Binary:** o JWT trata Header e Body como strings JSON, enquanto o DAT **manipula dados binários (Binary) diretamente**, otimizando o tamanho dos dados e aumentando a eficiência da análise.
* **Segurança integrada (campo `{{t('dat_secure')}}`):** no JWT, o Payload é por padrão exposto em texto simples, exigindo a aplicação de uma especificação separada como o JWE quando é necessária criptografia. Já o DAT **suporta criptografia no próprio token por meio do campo `{{t('dat_secure')}}`**.
* **Restrição de expiração imposta:** no JWT o campo `exp` (Claims) é opcional, mas no DAT o **campo `{{t('dat_expire')}}` é obrigatório na estrutura do token**, tornando a validação do prazo de validade imprescindível.
* **Sem negociação de algoritmo:** como o JWT carrega no próprio token o valor `alg` do cabeçalho, surge a superfície de ataque de confusão de algoritmo. No DAT, o algoritmo é **decidido pelo certificado**, e o token não contém informação de algoritmo.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
