# Códigos de erro

Estes são os códigos de erro comuns às bibliotecas de serviço oficialmente suportadas pelo DAT.

Cada código carrega dois valores — **impacto** e **repetição** — e alguns recebem ainda a etiqueta **suspeita**.

## Impacto — o golpe que o serviço sofre

É o critério para disparar um alerta. Observa-se apenas uma coisa: "o serviço está parado neste momento?".

| Impacto | Significado | Exemplo |
| --- | --- | --- |
| <span class="lg lg-critical">Crítico</span> | O serviço ou uma função específica **para.** Emissão impossível, sincronização com falha permanente, falha de inicialização | O servidor emissor não tem um único certificado utilizável |
| <span class="lg lg-partial">Parcial</span> | Algumas requisições ou ciclos falham, mas o serviço continua funcionando. Em geral, recupera-se sozinho | Um ciclo do CMS falha. Tudo continua com os certificados já existentes |
| <span class="lg lg-none">Sem impacto</span> | Uma requisição é rejeitada e pronto | Chega um token adulterado. Basta filtrá-lo |

**Sem impacto** não é caso de alerta. Se toda a equipe de plantão tivesse que verificar porque uma entrada errada chegou uma única vez, o alerta perderia todo o sentido.

## Suspeita — investigar se persistir

Os códigos com a etiqueta <span class="lg lg-suspect">Suspeita</span> **fazem parte da operação normal quando aparecem isolados**. O cliente pode enviar valores errados a qualquer momento, e o papel da biblioteca é justamente filtrá-los.

No entanto, se esses erros ocorrerem **de forma persistente ou concentrados em uma origem específica**, trata-se de um destes dois casos.

- **Anomalia de configuração** — implantação incorreta, clientes de uma versão antiga ainda em operação, ou certificados desalinhados.
- **Tentativa de invasão** — tentativa de passar na verificação com tokens ou chaves adulterados, ou uma varredura em busca de valores válidos.

Por isso, para esses códigos o correto é **acompanhar a contagem como métrica**. Basta avisar quando ultrapassar um limiar.

## Repetição

| Repetição | Significado |
| --- | --- |
| <span class="lg lg-transient">Transitório</span> | Resolve-se ao tentar de novo após um backoff |
| <span class="lg">Permanente</span> | Não repetir. É preciso corrigir a configuração ou a entrada |
| <span class="lg">Estado</span> | Não é um erro, e sim um sinal |

---

## Token

Problemas com a própria cadeia do token recebido.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="Rejeitar a requisição">
As partes separadas por pontos não são exatamente cinco, <code>expire</code> não é decimal puro, <code>cid</code> não é hexadecimal puro, <code>plain</code> ou <code>secure</code> não estão em base64url, ou um campo numérico ultrapassa a faixa inteira representável.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="Induzir a reemissão do token">
<code>expire &lt;= now</code>. <strong>O instante exato também conta como expirado</strong> — se <code>expire == now</code>, o token já está expirado.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="Verificar os logs">
Um erro de token que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

::: tip Nunca confunda expiração com erro de formato
As reações são opostas — a expiração é um fim de vida normal, basta levar à renovação do token; um erro de formato significa que o token nunca foi emitido por nós e deve ser rejeitado.

A análise **determina primeiro a estrutura** e só depois examina os valores. Uma cadeia como `"1.2.3"`, à qual faltam partes, não é um token expirado, mas simplesmente não é um token: por isso é `DAT_TOKEN_MALFORMED`.

Um sinal no campo `expire`, como `+100`, também não é expiração, e sim erro de formato. Somente dígitos ASCII puros são aceitos.
:::

---

## Certificado

O formato da cadeia do certificado e a questão de saber se esse certificado pode ser usado agora.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="Reimplantar o certificado">
As partes separadas por pontos não são exatamente oito, a análise de <code>cid</code>, <code>start</code>, <code>duration</code> ou <code>ttl</code> falhou, um campo de chave não está em base64url, ou <code>start + duration + ttl</code> ultrapassa u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="Renovar o certificado">
<code>start + duration + ttl &lt; now</code>. Totalmente expirado: nem emitir nem verificar é possível.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="Aguardar">
<code>now &lt; start</code>. A janela de emissão ainda não abriu.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="Implantar um novo certificado">
<code>now &gt; start + duration</code>, mas ainda resta ttl. Já não é possível emitir, apenas verificar.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="Verificar a configuração de implantação">
Um certificado que contém apenas a chave pública, sem a chave privada de assinatura. Verificar funciona, emitir não.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="Rejeitar a requisição">
Não há nenhum certificado correspondente ao <code>cid</code> do token. Ou é um token falsificado, ou uma implantação errada.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="Tentar de novo após a sincronização">
Esse <code>cid</code> ainda não foi recebido do CMS. Ocorre brevemente logo após implantar um novo certificado.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="Verificar a resposta do servidor">
O mesmo <code>cid</code> aparece mais de uma vez na lista importada.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="Verificar os logs">
Um erro de certificado que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

`DAT_CERT_NOT_FOUND` e `DAT_CERT_NOT_SYNCED` apresentam os mesmos sintomas, mas exigem reações diferentes. O primeiro é um `cid` que nunca emitimos: esperar não muda nada. O segundo se resolve assim que a sincronização acontece.

Um `DAT_CERT_NOT_FOUND` isolado basta filtrar; se o número crescer de repente, é porque a implantação saiu do compasso ou há tokens falsificados circulando.

---

## Assinatura

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="Bloquear a sessão, log de segurança">
A verificação da assinatura terminou em <strong>divergência</strong>. O valor HMAC não confere, ou ECDSA verify retorna false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="Rejeitar a requisição">
A parte da assinatura está vazia, não está em base64url, o comprimento de <code>r‖s</code> do ECDSA não corresponde à curva, ou a conversão para DER falhou.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="Verificar a configuração do servidor emissor">
Tentou-se assinar com uma chave apenas de verificação. Em tempo de execução não há chave privada.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="Verificar o tipo de chave e a biblioteca">
A operação de assinatura ou verificação <strong>sequer chegou a ser executada.</strong> Tipo de chave incorreto, handle liberado, ou erro interno da biblioteca criptográfica.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="Verificar os logs">
Um erro de assinatura que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

::: warning Não misture divergência com falha do backend
Os dois códigos estão em eixos opostos.

- `DAT_SIG_MISMATCH` — apenas uma assinatura recebida que não confere, portanto **sem impacto no serviço**; em contrapartida, se persistir, é caso de **suspeita**.
- `DAT_SIG_BACKEND` — a própria operação de verificação não rodou: é **um problema do nosso lado** e não um caso de suspeita.

Relatar um tipo de chave incorreto ou um bug de biblioteca como "divergência de assinatura" mistura, entre os indicadores de ataque, uma situação em que na verdade o nosso código é que está quebrado. Ao contrário, uma falsificação real classificada como erro de backend some por completo das métricas de suspeita.
:::

---

## Criptografia

Problemas de cifragem e decifragem do payload secure.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="Bloquear a sessão, log de segurança">
A tag de autenticação AES-GCM não confere. Ou o secure foi adulterado, ou a chave do certificado é outra.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="Rejeitar a requisição">
O texto cifrado não está vazio, mas não passa do tamanho do IV (12 bytes), ou a entrada excede o limite da implementação (<code>INT_MAX</code>, etc.).
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="Verificar o suporte da plataforma">
A operação de cifragem ou decifragem não pôde ser executada. Plataforma sem suporte a GCM, ou falha ao inicializar o contexto.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="Verificar os logs">
Um erro de cifragem/decifragem que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

**Um payload secure vazio não é erro.** Entrada vazia vira saída vazia, e nenhum código é emitido.

No caminho que pula a verificação de assinatura, a tag GCM é **a única checagem de integridade**. Por isso `DAT_CRYPTO_TAG_MISMATCH` não é agrupado com as demais falhas de decifragem sob um mesmo código.

---

## Chave

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="Substituir a chave">
O comprimento da chave não corresponde ao algoritmo declarado (HMAC 32/48/64, AES 16/32), o ponto não está sobre a curva, <code>d ∉ [1,n-1]</code>, o formato não é descomprimido (0x04), ou a chave privada e a pública não formam um par.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="Trocar de algoritmo">
Solicitou-se uma exportação apenas de verificação para um algoritmo da família HMAC.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="Verificar os logs">
Um erro de chave que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

**Três casos parecidos, mas diferentes:**

| Código | Significado |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **Limite estrutural do algoritmo.** HMAC é simétrico e não tem conceito de chave pública |
| `DAT_SIG_KEY_MISSING` | **Estado em tempo de execução.** Esta chave não contém, neste momento, uma chave privada |
| `DAT_CERT_VERIFY_ONLY` | **Forma de implantação.** Este certificado foi implantado apenas para verificação |

---

## Gerenciador

O estado do objeto que guarda os certificados e é usado para emitir e verificar.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="Verificar a conexão com o CMS">
Não há nenhum certificado. Ou antes da importação, ou após falhar a primeira sincronização com o CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="Decidir conforme a causa — ver a tabela abaixo">
Há certificados, mas nenhum deles pode ser usado para emitir neste momento. <strong>A causa vem junto com o erro.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="Corrigir o código que chama">
Um gerenciador ou certificado já liberado foi utilizado.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="Verificar os logs">
Um erro de gerenciador que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

A causa (`cause`) de `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` é uma destas quatro. **O que fazer difere completamente conforme a origem.**

| Causa | Significado | Repetição | Reação |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Antes do início da janela de emissão | **Transitório** | Resolve-se esperando |
| `DAT_CERT_ISSUANCE_ENDED` | Janela de emissão encerrada, só a verificação é possível | Permanente | É preciso implantar um novo certificado |
| `DAT_CERT_EXPIRED` | Todo o acervo está expirado | Permanente | É preciso renovar os certificados |
| `DAT_CERT_VERIFY_ONLY` | Todo o acervo é apenas de verificação | Permanente | **É um erro de configuração da implantação** |

Se o servidor emissor estiver configurado para receber apenas certificados de verificação, aparece `DAT_CERT_VERIFY_ONLY`. Esperar nunca resolve, portanto não é caso de repetição.

---

## Configuração

Problemas com os valores passados por quem chama. A família `CONFIG` é composta inteiramente por **erros que precisam ser corrigidos no código**; se aparecerem em produção, é porque a implantação está errada.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="Verificar o nome do algoritmo">
Nome de algoritmo desconhecido. Precisa coincidir exatamente com a notação de transporte (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="Corrigir o código que chama">
Um argumento obrigatório é null, está fora da faixa permitida (valor de tempo negativo, <code>interval &lt;= 0</code>), é de um tipo não suportado (um número ou booleano como payload em linguagens de tipagem dinâmica), ou o corpo a ser assinado está vazio.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="Corrigir a URI">
A URI do servidor CMS está fora da especificação. Não é analisável, o esquema não é http/https, ou há um caminho ou uma query anexada.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="Verificar os logs">
Um erro de configuração que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

---

## Interno

Problemas do ambiente de execução e do runtime.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="Verificar a implantação e a plataforma">
O backend criptográfico ou a API do runtime simplesmente não existe. Falta <code>crypto.subtle</code>, a plataforma não suporta AES-GCM, ou a versão do runtime é insuficiente.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="Verificar os logs">
Falha na alocação de memória, falha na geração de aleatoriedade, falha ao adquirir um lock, ou chegou-se a um ramo projetado como inalcançável.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` se resolve corrigindo o ambiente de implantação; `DAT_INTERNAL_UNKNOWN` costuma ser uma falha de runtime ou um bug da biblioteca.

---

## Sincronização do CMS

Sem a sincronização com o CMS, estes códigos não aparecem.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="Tentar de novo após um backoff">
Falha de DNS, conexão recusada, falha de TLS, <strong>tempo limite</strong>. O tempo limite não tem código próprio e está incluído aqui — a reação é a mesma.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="Verificar a configuração do token">
O servidor respondeu 401. O token está ausente ou incorreto.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="Verificar o nível do token">
O servidor respondeu 403. O token é válido, mas não tem permissão neste endpoint.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="Verificar a configuração da URL">
O servidor respondeu 404. A URL está errada.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="Tentar de novo após um backoff">
O servidor respondeu 5xx.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="Verificar o código de status">
Uma resposta não-2xx que não corresponde a nenhum dos casos acima.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="Verificar a versão do servidor">
A resposta não tem linha de versão, a linha de versão não é decimal pura, ou ultrapassa a faixa.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="Verificar CERT_* / KEY_* em cause">
A resposta chegou, mas os certificados não puderam ser aplicados. <strong>A origem vai em <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="Tratado automaticamente">
O servidor devolveu uma versão anterior à nossa. É a instrução de ressincronização completa.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="Aguardar a primeira sincronização">
Ainda não houve nenhuma sincronização bem-sucedida.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
A sincronização anterior ainda está rodando, por isso este ciclo foi pulado. Não é um erro.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="Verificar as opções de compilação">
A funcionalidade CMS não está incluída na compilação. Feature desativada ou CURL ausente.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="Verificar os logs">
Um erro de CMS que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

Os códigos em que a sincronização é considerada **falha permanente** (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`, `IMPORT_FAILED`) são todos críticos. Repetir não resolve nada enquanto os certificados continuam expirando: se ficar sem tratamento, o serviço acabará necessariamente parando.

Já `UNREACHABLE` e `SERVER_ERROR` são parciais. Tudo continua com os certificados existentes e a sincronização se recupera sozinha no ciclo seguinte — **mas se as falhas continuarem, no fim passa para crítico.** Coloque o alerta sobre o número de falhas consecutivas.

::: tip Falhas de sincronização não são lançadas como exceção
Mesmo que a primeira sincronização falhe, o gerenciador é devolvido normalmente — é melhor que a sincronização acabe acontecendo, ainda que tarde. A falha, em contrapartida, permanece como **estado consultável**.

| Cliente | Consulta |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

Se nunca houve sucesso, ali consta `DAT_CMS_NOT_SYNCED`; em funcionamento normal o valor está vazio.
:::

---

## Servidor

Códigos emitidos pelo servidor CMS. Os clientes **não os geram, apenas os recebem**.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
O cabeçalho <code>Authorization</code> está ausente, ou o token não está registrado em nenhum nível.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
O token está registrado, mas não no nível exigido por este endpoint.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="Configurar um token imediatamente">
Nenhum token está configurado, portanto a autenticação está inteiramente desativada. <strong>Com isso, até a API de emissão de certificados fica aberta sem autenticação.</strong> Não sai na resposta, apenas é registrada no log de inicialização.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
Os parâmetros de caminho ou de query não são interpretáveis, ou um argumento está fora da faixa permitida (delay negativo, mais de dez anos, etc.).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
O nome do algoritmo no caminho da requisição é desconhecido.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
Essa rota não existe ou o método é diferente.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
O tamanho do corpo da requisição foi excedido.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
Um erro de requisição que não se enquadra em nenhuma das categorias acima.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="Tentar de novo após um backoff">
Conexão com o banco perdida, pool de conexões esgotado, contenção de locks, tempo limite. <strong>O único código que usa 503</strong> — o sinal pelo qual o cliente sabe que "isso melhora esperando".
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="Verificar o estado do banco">
Falha de leitura ou escrita, tabela inexistente, esquema divergente, linha de certificado corrompida.
</ErrorCode>

Envelope de resposta:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

Para os erros que surgem ao criar e manipular certificados, o servidor usa como estão os códigos comuns acima (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`).

### Ao receber um código do servidor

O cliente envolve o código do servidor no seu próprio código `CMS` e preserva o original em `cause`.

| Recebido | HTTP | Código emitido pelo cliente |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (os demais) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (regressão de versão) | 200 | `DAT_CMS_VERSION_RESET` |

---

## Buscar por sintoma

| Sintoma | Código |
| --- | --- |
| Funciona logo após o login e pouco depois é rejeitado | `DAT_TOKEN_EXPIRED` — A vida útil do token acabou. Basta reemitir |
| A verificação falha só em um servidor específico | `DAT_CERT_NOT_SYNCED` — Esse servidor ainda não recebeu o novo CID |
| O mesmo token é rejeitado em todos os servidores | `DAT_CERT_NOT_FOUND` — Um CID que nunca emitimos |
| O servidor emissor não consegue criar tokens | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **Foi implantado como verify-only** |
| A emissão falha apenas logo após a inicialização | `DAT_MANAGER_NO_CERTIFICATE` — Antes da primeira sincronização. Resolve-se em breve |
| A sincronização com o CMS falha continuamente | `DAT_CMS_UNAUTHORIZED` — O token está errado. Repetir não resolve |
| Não chega nenhum certificado | `DAT_CMS_ENDPOINT_NOT_FOUND` — Há um erro de digitação na URL |
| Falha apenas em uma plataforma específica | `DAT_INTERNAL_UNAVAILABLE` — Falta o backend criptográfico |
| As falhas de verificação aumentam de repente | `DAT_SIG_MISMATCH` — Isolada é inofensiva, mas **em massa é tentativa de falsificação** |
| A decifragem do secure falha de repente | `DAT_CRYPTO_TAG_MISMATCH` — Certificados desalinhados ou **tentativa de adulteração** |
| Aviso no log de inicialização do CMS | `DAT_AUTH_DISABLED` — **A autenticação está desligada.** A API de emissão está aberta |

---

## Apêndice

### Sintaxe dos códigos

```
DAT_<área>_<causa>
```

- Quando a mesma causa ocorre em áreas diferentes, **o nome da causa é idêntico.** `DAT_TOKEN_MALFORMED` e `DAT_CERT_MALFORMED` diferem apenas no objeto; o sentido é o mesmo.
- `_UNKNOWN` é **exclusivamente o recuo** de cada área. Não é usado com outro sentido, como "algoritmo desconhecido" (para isso existe `_UNSUPPORTED`).
- A cadeia do código é um contrato público. A mensagem pode ser alterada livremente; o código, não.

| Categoria | Prefixo de código |
| --- | --- |
| Token | `DAT_TOKEN_` |
| Certificado | `DAT_CERT_` |
| Assinatura | `DAT_SIG_` |
| Criptografia | `DAT_CRYPTO_` |
| Chave | `DAT_KEY_` |
| Gerenciador | `DAT_MANAGER_` |
| Configuração | `DAT_CONFIG_` |
| Interno | `DAT_INTERNAL_` |
| Sincronização do CMS | `DAT_CMS_` |
| Servidor | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### Acesso conforme o cliente

| Cliente | Tipo de erro | Código | Classe de repetição | Evento de segurança |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| Servidor CMS | Envelope JSON | campo `code` | — | — |

`Evento de segurança` só retorna `true` nos dois casos em que a falsificação ou a adulteração é certa (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`). A etiqueta **suspeita** deste documento abrange mais (chegando a tokens, chaves e requisições adulterados); por ora é apenas uma classificação da documentação e não é exposta pela API do cliente.

O nível de **impacto** também é uma classificação da documentação. Um mesmo código pode atingir de formas diferentes conforme onde ocorre — `DAT_KEY_INVALID`, por exemplo, não tem impacto quando serve para filtrar um token recebido, mas faz toda a sincronização fracassar quando ocorre ao ler um certificado durante a sincronização com o CMS.

**As causas subjacentes não são perdidas.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` e `DAT_CMS_IMPORT_FAILED` transmitem a origem pelo encadeamento de exceções de cada linguagem (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning C/C++ também mantém os valores inteiros
Os valores inteiros existentes de `dat_error_t` são mantidos por compatibilidade de ABI, mas **quem vale é o código textual**. A biblioteca não devolve mais os valores antigos, portanto uma comparação como `err == DAT_ERROR_INVALID_DAT` já não confere. Compare por meio de `dat_error_code(e)`.

C não tem encadeamento de exceções, então a causa é consultada à parte com `dat_manager_issuable_cause()`.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
