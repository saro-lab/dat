# Códigos de erro

As implementações de DAT fornecem códigos de erro estáveis além de mensagens legíveis. Os programas devem decidir seu comportamento com base no código e na classificação de nova tentativa, sem comparar strings de mensagens.

## Como ler

```text
DAT_<área>_<causa>
```

| Prefixo | Área |
| --- | --- |
| `DAT_TOKEN_` | String DAT e expiração |
| `DAT_CERT_` | String e estado do certificado |
| `DAT_SIG_` | Assinatura e verificação |
| `DAT_CRYPTO_` | Criptografia e descriptografia |
| `DAT_KEY_` | Formato e permissões da chave |
| `DAT_MANAGER_` | Gerenciador de certificados |
| `DAT_CONFIG_` | Argumentos de chamada e configuração |
| `DAT_INTERNAL_` | Funções internas do runtime |
| `DAT_CMS_` | Sincronização do cliente CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Servidor CMS |

`_UNKNOWN` é usado apenas para erros que não podem ser classificados por outro código na respectiva área. A mesma causa usa o mesmo nome mesmo em áreas diferentes.

## Classificação de nova tentativa

| Classificação | Significado | Tratamento |
| --- | --- | --- |
| Transitório | Pode funcionar quando o estado externo se recuperar | Tentar novamente de forma limitada após backoff |
| Estado | Pode funcionar quando a sincronização dos certificados ou o horário mudar | Atualizar o estado necessário e tentar novamente |
| Permanente | Tentar novamente com a mesma entrada continuará falhando | Corrigir a entrada, a configuração ou o código |

## Token e certificado

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
A quantidade de campos, os números ou a representação Base64Url do DAT não correspondem à especificação. Descarte a entrada.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
O horário de expiração do DAT é igual ou anterior ao horário atual. É necessário obter um novo DAT.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
A estrutura da string do certificado ou a representação dos campos está incorreta.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Não há certificado correspondente ao `cid` do DAT. Confira o estado de sincronização dos certificados.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
O certificado necessário talvez ainda não tenha chegado ao serviço. Sincronize imediatamente e avalie novamente.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
O horário de início do certificado ainda não chegou. Confira o horário do sistema e o momento de distribuição do certificado.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
O período em que o certificado podia verificar terminou.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
O mesmo `cid` apareceu mais de uma vez em uma única lista de importação. Toda a importação é rejeitada.
</ErrorCode>

## Assinatura, criptografia e chaves

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
A assinatura não corresponde ao conteúdo. O DAT pode ter sido alterado ou assinado com outra chave.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
A tag de autenticação AES-GCM não corresponde. Confira se o conteúdo criptografado foi alterado ou se o certificado não corresponde.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
O comprimento, o formato ou a combinação de algoritmo da chave é inválido.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Houve uma tentativa de emitir DAT com um certificado exclusivo para verificação. Os serviços emissores precisam de um certificado completo.
</ErrorCode>

`DAT_SIG_MISMATCH` e `DAT_CRYPTO_TAG_MISMATCH` são erros classificados como verdadeiros pela API pública de eventos de segurança. Uma única entrada inválida não representa indisponibilidade do serviço, mas repetições devem ser observadas como um possível evento de segurança.

## Gerenciador e configuração

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
O gerenciador não contém certificados. Importe certificados ou conclua a sincronização do CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Há certificados, mas nenhum certificado completo pode emitir no momento. Confira a expiração, o horário de início ou o estado verify-only na cadeia de causas.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Um argumento de chamada ou valor de configuração está fora do intervalo permitido.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
A função criptográfica ou de rede necessária não está disponível nesta plataforma.
</ErrorCode>

## Cliente CMS

| Código | Significado | Tratamento comum |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Formato inválido da URI do CMS | Corrigir a configuração |
| `DAT_CMS_UNAUTHORIZED` | Falha na autenticação | Corrigir o token |
| `DAT_CMS_FORBIDDEN` | O papel não tem permissão | Conferir o papel do token |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | O caminho não existe ou é diferente | Conferir o endereço e o caminho do CMS |
| `DAT_CMS_NETWORK` | Falha de conexão ou transferência | Conferir a rede e aplicar backoff |
| `DAT_CMS_TIMEOUT` | Timeout | Ajustar a rede e os timeouts |
| `DAT_CMS_SERVER_ERROR` | Erro do servidor CMS | Conferir o servidor e aplicar backoff |
| `DAT_CMS_RESPONSE_INVALID` | Formato inválido de uma resposta bem-sucedida | Conferir o contrato entre servidor e cliente |
| `DAT_CMS_VERSION_RESET` | A versão do servidor regrediu | Conferir os dados do CMS e a implantação |
| `DAT_CMS_IMPORT_FAILED` | Falha ao aplicar os certificados recebidos | Conferir a cadeia de causas |
| `DAT_CMS_STOPPED` | Uso de um gerenciador já encerrado | Criar outro gerenciador ou corrigir a ordem das chamadas |

Bibliotecas cuja sincronização inicial é best-effort armazenam o erro no campo de último erro. Se a inicialização tiver de falhar, use a API de sincronização imediata que retorna ou lança o erro diretamente.

## Servidor CMS

| Código | HTTP | Significado |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | O token está ausente ou é inválido |
| `DAT_AUTH_FORBIDDEN` | 403 | O papel do token não corresponde à permissão solicitada |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Nome de algoritmo não suportado |
| `DAT_REQ_NOT_FOUND` | 404·405 | O caminho ou o método não corresponde |
| `DAT_REQ_TOO_LARGE` | 413 | Código reservado para exceder o limite do corpo da solicitação |
| `DAT_STORE_UNAVAILABLE` | 503 | O armazenamento está temporariamente indisponível |
| `DAT_STORE_UNKNOWN` | 500 | Erro não classificado durante o processamento do armazenamento |

Atualmente, os clientes não expõem literalmente o código do servidor em um JSON não 2xx: eles convertem o status HTTP em um código `DAT_CMS_*`. Portanto, o código no log do servidor e o código de erro do cliente podem ser diferentes.

## Como consultar por linguagem

| Ambiente | Código de erro | Classificação de nova tentativa |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Erros com causas subjacentes podem ser consultados pela cadeia de exceções ou pela API de acesso à causa de cada linguagem.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
