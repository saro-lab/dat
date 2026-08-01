# Certificado DAT

## 1. Visão geral

O **certificado DAT** é a especificação que controla a permissão de emissão do DAT e gerencia os algoritmos de assinatura e de criptografia do token, além das informações de chave (Key).

Cada certificado possui um ID único (`CID`) e, ao impor a janela de emissão do DAT e o prazo de validade (TTL) dos tokens gerados, gerencia com segurança o ciclo de vida dos tokens.

No DAT, **a rotação de chaves não é opcional.** Como a janela de emissão está gravada no certificado no nível da especificação, uma vez passado o período não é possível criar novos tokens com aquele certificado.

---

## 2. Estrutura do certificado

<WireFormat
    title="Formato wire do certificado"
    hint="Passe o mouse sobre cada campo para ver a descrição."
    :segments="[
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID único do certificado. É confrontado com o campo cid do DAT.'},
        {name: 'start', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de início da emissão (Unixtime em segundos).'},
        {name: 'duration', type: 'uint64 (decimal)', kind: 'meta', note: 'Janela de emissão (em segundos). É uma duração, não um instante absoluto.'},
        {name: 'ttl', type: 'uint64 (decimal)', kind: 'meta', note: 'Prazo de validade (em segundos) dos DATs emitidos com este certificado.'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: 'Nome do algoritmo de assinatura.'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: 'Nome do algoritmo de criptografia.'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Chave de assinatura. Ao exportar como verify-only, no ECDSA sai apenas a chave pública.'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Chave de criptografia. Por ser simétrica, sai sempre por inteiro, independentemente de ser verify-only.'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. Especificação detalhada por campo

`CID` : Hex (uint64)

* É o ID único que identifica o certificado. É mapeado com o campo `CID` do DAT e determina qual certificado usar na verificação.
* **O CID é um identificador imutável.** Ao substituir a chave, não se reutiliza o mesmo CID: emite-se um certificado com um novo CID.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Indica, em segundos (Seconds), o **momento de início** a partir do qual se pode emitir DAT usando esse certificado.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* É a **janela de validade para emissão** do certificado. Depois que esse período (em segundos) transcorre a partir de `{{t('dat_issue_start')}}`, não é mais possível emitir novos DATs com esse certificado.
* **É uma duração (duration), não um instante absoluto.** O momento de término é calculado como `start + duration`.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* É o prazo de validade (Time To Live) dos DATs emitidos com esse certificado. Ao gerar o DAT, o valor de `expire` é definido somando esse valor ao momento da emissão.

`{{t('sig_alg')}}` : String / Enum

* É o **algoritmo de assinatura** a ser usado ao gerar e verificar o campo `signature` do DAT.

`{{t('crypto_alg')}}` : String / Enum

* É o **algoritmo de criptografia** a ser usado ao criptografar e descriptografar o campo `secure` do DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* É o dado de chave usado na assinatura e na verificação. (Dependendo do algoritmo, pode ser a Public/Private Key de uma chave assimétrica ou uma chave simétrica.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* É o dado de chave de criptografia usado na cifragem e na decifragem do campo `secure`.

### 2.2. Cálculo de tempo

```
end    = start + duration        momento de término da emissão
expire = end + ttl               momento de expiração final do certificado
```

* Todos os cálculos são feitos em uint64 e **apenas o overflow é rejeitado como erro**.
* `duration = 0` e `ttl = 0` são **valores legítimos**. É possível representar um certificado cuja janela de emissão fecha imediatamente, ou um certificado que gera tokens que se tornam inválidos assim que expiram.
* Como todos os campos são inteiros sem sinal, **valores negativos não existem no tipo.**

### 2.3. Assinatura do construtor

Todas as implementações de linguagem usam a ordem de argumentos abaixo.

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning O terceiro argumento é uma duração, não o momento de término
Se você passar o momento absoluto de término (end) no terceiro argumento, será criado, sem nenhum erro, **um certificado com uma janela de validade completamente equivocada**, pois o valor entra diretamente em `start + duration`.
:::

---

## 3. Ciclo de vida do certificado

<CertTimeline
    title="Os quatro intervalos do certificado"
    caption="O certificado só expira definitivamente depois de percorrer os intervalos de atraso de emissão → emissão possível → TTL restante do DAT."
    :marks="['Criação', 'Início da emissão', 'Fim da emissão', 'Expiração final']"
    :phases="[
        {label: 'Atraso de emissão (delay)', weight: 1.2, kind: 'delay', note: 'Tempo para que todos os nós recebam o certificado'},
        {label: 'Emissão possível (duration)', weight: 3, kind: 'issue', note: 'Emissão e verificação de DAT possíveis'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Emissão impossível, somente verificação'},
    ]"
/>

| Intervalo | Emissão | Verificação | Condição |
| --- | --- | --- | --- |
| Atraso de emissão | ✕ | ○ | `issuable() == false` |
| Emissão possível | ○ | ○ | `issuable() == true` |
| TTL restante do DAT | ✕ | ○ | Janela de emissão fechada, mas antes da expiração |
| Após a expiração final | ✕ | ✕ | `expired() == true` |

* A **possibilidade de emissão** é determinada por `signable() && start <= now <= end`, **incluindo ambas as extremidades**.
* Mesmo depois que a janela de emissão fecha, o certificado continua vivo por mais `ttl`. Isso porque um token emitido pouco antes do fechamento da janela precisa poder cumprir toda a sua vida útil.
* O intervalo de **atraso de emissão (delay)** existe para dar tempo a que todos os nós do cluster recebam o novo certificado. Para mais detalhes, consulte o documento [{{t('menu_spec_cms')}}](./cms).

---

## 4. Algoritmos

### 4.1. Algoritmos de assinatura

Lista dos algoritmos de assinatura para prevenir adulteração e falsificação do DAT. São suportados os modos de chave simétrica e de chave assimétrica.

| Nome | Modo | Observação |
| --- | --- | --- |
| `ECDSA-P256` | assimétrico | Assinatura digital de curva elíptica (NIST secp256r1) |
| `ECDSA-P384` | assimétrico | Assinatura digital de curva elíptica (NIST secp384r1) |
| `ECDSA-P521` | assimétrico | Assinatura digital de curva elíptica (NIST secp521r1) |
| `HMAC-SHA256-MFS` | simétrico | Keyed-Hashing baseado em chave secreta de tamanho fixo de 256 bits |
| `HMAC-SHA384-MFS` | simétrico | Keyed-Hashing baseado em chave secreta de tamanho fixo de 384 bits |
| `HMAC-SHA512-MFS` | simétrico | Keyed-Hashing baseado em chave secreta de tamanho fixo de 512 bits |

> **MFS (Maximum Fixed Secret):** método que utiliza uma chave secreta de tamanho fixo com o mesmo número de bits do tamanho de saída (Output) do algoritmo de hash.

### 4.2. Algoritmos de criptografia

Lista dos algoritmos de criptografia autenticada (Authenticated Encryption) para proteger os dados confidenciais internos do DAT (campo `secure`).

| Nome | Tamanho da chave | Estrutura |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-bit | IV(96bit) + resultado da criptografia |
| `IV-AES256-GCM` | 256-bit | IV(96bit) + resultado da criptografia |

> **Incorporação do IV (Initialization Vector):** um NONCE (IV) exclusivo de 96 bits, gerado a cada criptografia, é combinado como prefixo (Prefix) antes do resultado da criptografia. Na descriptografia, os primeiros 96 bits são separados como IV para realizar a decifragem.

### 4.3. Validação do tamanho da chave

Ao importar um certificado, **verifica-se se o número de bits do algoritmo declarado coincide com o tamanho real da chave**.

Por exemplo, se um certificado declarado como `IV-AES256-GCM` contiver uma chave de 16 bytes, a própria importação é rejeitada. Sem essa verificação, acreditando-se estar usando AES-256, o sistema operaria de fato com AES-128.

---

## 5. Exportação verify-only

Servidores que apenas realizam verificação não precisam receber a chave privada de assinatura. Para isso, o certificado DAT oferece a **exportação verify-only**.

<FlowDiagram
    title="Caminhos de distribuição do certificado completo e do certificado verify-only"
    :legend="{req: 'Requisição', res: 'Resposta', sync: 'Distribuição de certificados'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Servidor de emissão', kind: 'issuer'},
        {id: 'verifier', label: 'Servidor somente de verificação', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: 'Certificado completo (inclui a chave privada de assinatura)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'Certificado verify-only', kind: 'sync'},
    ]"
/>

| Algoritmo de assinatura | `support_verify_only()` | Resultado da exportação verify-only |
| --- | --- | --- |
| Família **ECDSA** | `true` | Como chave de assinatura sai **apenas a chave pública** (Base64 de 130 caracteres → 87 caracteres) |
| Família **HMAC** | `false` | Ocorre um **erro explícito** |

O HMAC usa chave simétrica, portanto não existe algo como uma "chave capaz apenas de verificar". Por isso, ao se tentar a exportação verify-only, ela não é silenciosamente ignorada: **o erro é notificado imediatamente.** Como chamar a exportação verify-only com certificados HMAC misturados resulta em falha, quem opera nós exclusivamente de verificação deve usar a família ECDSA.

::: danger A chave de criptografia sai por inteiro mesmo no verify-only
A chave AES do campo `secure` é **simétrica**, portanto é **sempre exportada por inteiro**, independentemente de ser verify-only ou não. Isso porque, para descriptografar, é necessária a mesma chave usada para criptografar.

Ou seja, um servidor que recebeu um certificado verify-only:

* **não consegue forjar assinaturas** — sem a chave privada, não consegue criar novos DATs.
* **consegue descriptografar o payload `secure`** — não há confidencialidade em relação a ele.

O verify-only é um mecanismo para repartir a *permissão de emissão*, não a *confidencialidade*. Se um valor precisa ficar oculto dos nós de verificação, ele não deve ser colocado em `secure`.
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
