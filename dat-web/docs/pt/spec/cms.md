# DAT CMS

O DAT CMS é um serviço opcional que cria, armazena e entrega certificados aos gerenciadores clientes. Este documento descreve o contrato de sincronização entre cliente e servidor. Para instalação e operação, consulte o [guia do serviço DAT CMS](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Sincronização de certificados"
  :actors="[
    {id: 'client', label: 'Cliente', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Solicita a versão atual e os certificados', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Responde com a versão e os certificados', kind: 'res'},
    {from: 'client', label: 'Valida tudo e aplica de forma atômica', kind: 'note'},
  ]"
/>

## Endpoints por função

| Função | Caminho | Uso |
| --- | --- | --- |
| Obter certificados completos | `GET /v1/certs?version=<n>` | Serviços que emitem DAT |
| Obter certificados exclusivos para verificação | `GET /v1/certs/verify-only?version=<n>` | Serviços que apenas verificam e descriptografam |
| Registrar certificado | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Operador ou tarefa de geração de certificados |

As consultas de certificados completos e exclusivos para verificação podem ser protegidas por papéis de token diferentes. Configure a opção `verifyOnly` no gerenciador cliente para impedir que um serviço exclusivo para verificação solicite certificados completos.

## Cursor de versão

O cliente envia ao servidor a última versão aplicada. Se o estado do servidor não tiver mudado, não é necessário enviar os certificados novamente. Quando houver um novo estado, a resposta contém a versão na primeira linha e os certificados a partir da linha seguinte.

Se uma resposta bem-sucedida contiver apenas a versão e nenhum certificado, os certificados e o emissor existentes serão preservados. Uma resposta em que a versão do servidor seja inferior à do cliente é tratada como erro sem reverter o estado.

## Regras de aplicação dos certificados

- Se o mesmo `cid` aparecer repetido na resposta, toda a resposta será rejeitada.
- Se o `cid` da nova resposta for igual a um já armazenado, o certificado existente será mantido.
- Todos os certificados são analisados e validados antes que o estado seja aplicado de uma só vez.
- Não se deixa um estado em que apenas alguns certificados tenham sido aplicados.
- Um certificado completo adequado é escolhido entre os que podem emitir no momento para atuar como emissor.

## Sincronização inicial e manual

A primeira sincronização ao criar o gerenciador cliente geralmente é best-effort. Mesmo que falhe, o gerenciador é criado e o último erro específico é armazenado. Se a inicialização da aplicação tiver de falhar, chame a API de sincronização imediata da biblioteca para devolver o erro ao chamador.

Um ambiente sem sincronização automática pode desativar o interval e sincronizar manualmente quando necessário. Se a sincronização automática for usada, feche ou interrompa o gerenciador ao encerrar a aplicação.

## Rede e erros

Configure os timeouts de conexão e da solicitação completa conforme o ambiente operacional. Como a política de redirecionamento varia por runtime, consulte a documentação da biblioteca. Atualmente, respostas CMS não 2xx são classificadas como erros `DAT_CMS_*` de acordo com o status HTTP e não preservam literalmente o código de erro detalhado do JSON do servidor.

Durante uma falha temporária no armazenamento, o servidor pode fornecer o último snapshot de certificados bem-sucedido. Se ainda não houver um snapshot bem-sucedido, ele responderá com `DAT_STORE_UNAVAILABLE`.

## Documentação do serviço

Implantação, banco de dados, tokens de acesso e configuração de execução são descritos no [guia do serviço DAT CMS](../svc/docker-saro-lab-dat-cms).

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
