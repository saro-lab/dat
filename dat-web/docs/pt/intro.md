# O que é DAT?

DAT (Distributed Access Token) é uma especificação de token de acesso usada por um serviço emissor e um serviço verificador que compartilham o mesmo certificado. Como a verificação não precisa consultar novamente o serviço emissor nem um armazenamento central de sessões, o resultado da autenticação pode ser transmitido com menos acoplamento entre serviços.

<WireFormat
  hint="Os campos separados por pontos formam um DAT."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Unix time de expiração'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID do certificado'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Dados públicos'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Dados criptografados'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Assinatura do conteúdo'},
  ]"
/>

## Componentes

### DAT

É uma string enviada por um usuário ou serviço junto com a solicitação. Inclui o horário de expiração e o ID do certificado, e pode conter dados públicos e criptografados ao mesmo tempo.

### Certificado

Contém os algoritmos, as chaves e o intervalo de tempo necessários para criar e conferir um DAT. O ID do certificado, `cid`, não muda; use um novo `cid` ao rotacionar as chaves.

### Gerenciador

O gerenciador da biblioteca cliente armazena certificados, cria DAT com um certificado atualmente apto a emitir e verifica cada DAT com o certificado correspondente ao seu `cid`.

### DAT CMS

É um servidor opcional que cria, armazena e entrega certificados aos serviços. Pode fornecer certificados completos aos serviços emissores e certificados exclusivos para verificação aos serviços que apenas verificam.

## Emissão e verificação

<ArchFlow
  :user="{label: 'Usuário', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Gerenciamento de certificados', 'Sincronização baseada em versões']}"
  :service="{servers: [
    {label: 'Serviço emissor', kind: 'issuer', icon: 'login', request: 'Informações de autenticação', response: 'DAT', sync: 'Certificado completo'},
    {label: 'Serviço verificador', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Recurso protegido', sync: 'Certificado exclusivo para verificação'},
  ]}"
/>

O serviço emissor define os dados `plain` e `secure` e cria o DAT. O serviço verificador confere o horário de expiração, a assinatura e o conteúdo criptografado antes de entregar as duas áreas de dados à aplicação. `plain` é assinado, mas não criptografado, portanto não deve conter segredos nem dados pessoais.

## Por que a verificação continua funcionando quando o certificado muda?

Quando um novo certificado fica apto a emitir, os DAT seguintes usam o novo `cid`. O certificado anterior permanece disponível para verificação até o fim do TTL dos DAT já emitidos. Assim, a rotação de chaves pode coexistir com o período de verificação dos tokens anteriores.

## Ambientes adequados

- Ambientes em que a autenticação e o recurso real são atendidos por serviços diferentes
- Ambientes em que vários runtimes emitem ou verificam o mesmo token
- Ambientes que transmitem informações de autorização de curta duração sem consultar uma sessão central
- Ambientes que precisam separar informações públicas de roteamento e dados protegidos em um único token

O DAT não define a política de autorização. O fato de um DAT ser válido e a decisão da aplicação de permitir uma solicitação são questões distintas.

## Próximos documentos

- [Especificação do DAT](./spec/dat): campos do token e regras de verificação
- [Certificados](./spec/dat-certificate): chaves e intervalos de tempo
- [Especificação do DAT CMS](./spec/cms): contrato de sincronização
- [Bibliotecas](./libs/): aplicação em um projeto

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
