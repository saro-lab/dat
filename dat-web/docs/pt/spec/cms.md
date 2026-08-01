# Sincronização do CMS e operação de certificados

## 1. Visão geral

O **DAT CMS (Certificate Management Service)** é o servidor que gera e distribui os certificados a serem compartilhados por todo o cluster.

Cada aplicação recebe periodicamente a lista de certificados por meio do cliente CMS (`DatCmsManager`), e essa sincronização **automatiza a rotação de chaves**. Mesmo que o operador não substitua as chaves manualmente, os certificados são gerados de novo em um ciclo definido e os antigos expiram por conta própria.

<ArchFlow
    :user="{label: 'Usuário', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Cria certificados por período de validade', 'Remove os expirados']}"
    :service="{servers: [
        {label: 'Servidor de login', kind: 'issuer', icon: 'login',
         request: 'Solicitação de login', response: 'Emite um DAT com o certificado', sync: 'Sync dos certificados de emissão'},
        {label: 'Servidores de conteúdo', kind: 'verifier', icon: 'apps',
         request: 'Requisição de conteúdo com DAT', response: 'Verifica o DAT e atende', sync: 'Sync dos certificados de verificação'},
    ]}"
/>

Apenas o servidor de login recebe certificados capazes de emitir; os servidores de conteúdo recebem certificados somente de verificação. **Um servidor de conteúdo só precisa conhecer o CMS e não precisa conhecer o servidor de login.**

---

## 2. Protocolo de sincronização

### 2.1. Requisição e resposta

<FlowDiagram
    title="Um ciclo de sincronização"
    :legend="{req: 'Requisição', res: 'Resposta', sync: 'Sincronização de certificados'}"
    :actors="[
        {id: 'app', label: 'Aplicação', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: 'version armazenada = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: token)', kind: 'req'},
        {from: 'cms', label: 'version do servidor = M, seleciona os certificados mais novos que N', kind: 'note'},
        {from: 'cms', to: 'app', label: 'linha 1: M / linha 2 em diante: lista de certificados', kind: 'res'},
        {from: 'app', label: 'se a lista estiver vazia, mantém a version e encerra', kind: 'note'},
        {from: 'app', label: 'version = M somente se import(clear = true) tiver sucesso', kind: 'note'},
    ]"
/>

| Endpoint | Finalidade |
| --- | --- |
| `GET /v1/certs?version=N` | Certificados completos (incluem a chave privada de assinatura) |
| `GET /v1/certs/verify-only?version=N` | Certificados somente de verificação |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | O mesmo conteúdo em formato JSON |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | Criação manual de certificado (requer token Master) |
| `GET /health` | Verificação de estado |

O corpo da resposta é texto simples cuja **primeira linha é a version atual do servidor**, e a partir da linha seguinte vêm os certificados, um por linha.

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. Cursor de versão

O cliente memoriza a última version bem-sucedida e a envia na requisição seguinte. O servidor seleciona e devolve apenas os certificados mais novos que esse valor.

* Se a version do cliente estiver **no passado em relação ao servidor** → são devolvidos apenas os certificados criados depois dela.
* Se a version do cliente estiver **no futuro em relação ao servidor** (troca de servidor, reinicialização do banco de dados etc.) → o cursor volta para `0` e é devolvido o **conjunto completo**.
* O cliente **só avança a version quando a importação tem sucesso.** Isso evita a situação em que o cursor avança com uma resposta malsucedida e certificados são perdidos permanentemente.

::: tip A requisição é incremental, mas a resposta é uma substituição completa
`?version=N` é uma requisição do tipo "me dê as mudanças posteriores a N", mas o cliente **substitui (clear = true) a lista existente pela lista recebida, em vez de mesclá-las**. Isso porque o servidor sempre determina e envia o conjunto completo de certificados válidos; graças a esse método, um certificado revogado (revoke) no CMS não permanece no cliente.
:::

### 2.3. Tokens de autenticação

O CMS divide o acesso em três tipos de token.

| Token | Permissão |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

O princípio é fornecer apenas o token Verify Cert aos servidores que somente verificam. Contudo, como a chave de criptografia também é incluída na resposta verify-only, confira o significado disso junto com as advertências do documento [{{t('menu_spec_cert')}}](./dat-certificate#_5-exportacao-verify-only).

---

## 3. Atraso de emissão do certificado (delay)

Se um certificado recém-criado for usado imediatamente para emissão, outro nó que ainda não sincronizou não conseguirá verificar os tokens assinados com ele. O **atraso de emissão** é o valor que existe para eliminar essa janela.

<CertTimeline
    title="O que o intervalo de atraso faz"
    caption="Durante o intervalo de atraso, todos os nós recebem o certificado, e só depois disso a emissão começa."
    :marks="['Criação', 'Início da emissão', 'Fim da emissão', 'Expiração final']"
    :phases="[
        {label: 'Atraso de emissão', weight: 1.2, kind: 'delay', note: 'Espera pela sincronização de todos os nós'},
        {label: 'Emissão possível', weight: 3, kind: 'issue', note: 'Emissão + verificação'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Somente verificação'},
    ]"
/>

Suponha, por exemplo, que o CMS crie o certificado A e que os servidores 1 e 2 sincronizem em um ciclo de 60 segundos. Se o servidor 1 receber primeiro e emitir um DAT com A enquanto o servidor 2 ainda não o recebeu, o servidor 2 não conseguirá verificar esse DAT.

Se o atraso for definido em 180 segundos, o certificado permanece impossibilitado de emitir durante 180 segundos após sua criação e, nesse meio-tempo, todos os servidores concluem a sincronização com segurança. Considerando falhas de rede temporárias, recomenda-se configurá-lo com um valor **pelo menos 3 a 4 vezes maior que o ciclo de sincronização de cada servidor**.

---

## 4. Comportamentos intencionais

Todos os comportamentos abaixo são **intencionais por design** e não são defeitos. Eles são explicitados aqui porque podem parecer diferentes do esperado durante a operação.

### 4.1. Continua assinando com o certificado em cache mesmo depois que a janela de emissão fecha

A aplicação continua usando o certificado de emissão escolhido no momento da sincronização e não reavalia `issuable()` a cada emissão.

**Motivo:** se a janela de emissão fechar enquanto a conexão com o CMS está interrompida, no modelo de reavaliação **os logins de todo o serviço param naquele instante**. Nesse caso, o DAT optou por "continuar emitindo mesmo que não se tenha conseguido receber um novo certificado".

**Custo:** se a falha de rede se prolongar, tokens podem continuar saindo com um certificado cuja janela de emissão já passou. Ainda assim, esses tokens são normalmente verificados em outros nós até a expiração final do certificado, e por isso considerou-se esse um trade-off melhor do que o serviço morrer em uma situação de falha.

### 4.2. Certificados renovados com o mesmo CID são descartados

Se chegar um certificado com um CID igual a um já existente, **o recém-chegado é ignorado**.

**Motivo:** o CID é o identificador imutável do certificado. Se um mesmo CID passasse a apontar para chaves diferentes, não seria possível saber com qual chave verificar os tokens já emitidos que estão em circulação.

::: warning A troca de chave deve ser feita obrigatoriamente com um novo CID
Se você mantiver o mesmo CID e distribuir apenas a chave alterada, **isso nunca será refletido no cliente e nenhum erro será emitido.** Ao substituir a chave, emita um certificado com um novo CID.
:::

### 4.3. Se não houver novos certificados, a lista existente é mantida

Se a resposta não contiver nenhum certificado, o cliente **mantém a lista que possui como está.** Ele não esvazia a lista.

**Motivo:** se, no pior momento — servidor de certificados fora do ar ou resposta anômala —, os certificados armazenados fossem apagados, **toda a verificação de tokens falharia** imediatamente. Se nada novo foi recebido, é mais seguro aguentar com o que já se tem.

### 4.4. O modo SINGLE_NODE gera um certificado a cada inicialização

Ao executar o CMS em modo de nó único, ele **cria um certificado a cada inicialização**, independentemente de existir ou não um certificado apto a emitir.

**Motivo:** o modo de nó único é uma configuração para subir o CMS de forma independente, sem infraestrutura adicional. É preciso que exista um certificado apto a emitir imediatamente após a inicialização.

**Atenção:** se as reinicializações se repetirem, os certificados vão se acumulando. Ainda assim, cada certificado é excluído da lista após seu momento de expiração, de modo que a quantidade não cresce indefinidamente.

### 4.5. Se não houver certificado apto a emitir, a emissão ocorre imediatamente, sem atraso

Se, no momento de criar o certificado, não existir nenhum certificado apto a emitir, o CMS **pula o intervalo de atraso** e incorpora o tempo de atraso à janela de emissão.

**Motivo:** respeitar o atraso significaria que, durante esse tempo, todo o cluster não conseguiria emitir nenhum token. Na primeira inicialização ou na recuperação de uma falha total, é preciso poder emitir imediatamente. Nesse caso, fica um aviso registrado no log do servidor.

---

## 5. Revogação e expiração de certificados

* O certificado permanece na lista de distribuição **até o momento de sua expiração final (`start + duration + ttl`)**. Ele não desaparece assim que a janela de emissão se fecha.
* Um DAT emitido pouco antes do fim da janela de emissão continua vivo por mais o seu TTL, de modo que até um servidor de verificação que iniciou pela primeira vez após aquele momento consegue receber o certificado e verificar esse token.
* Certificados cuja expiração final já passou saem da lista e, em uma rotina de limpeza posterior, também são removidos do armazenamento.

---

## 6. Implantação

As opções de execução do servidor CMS, os métodos de implantação via Docker · Kubernetes · binário e as variáveis de ambiente são tratados em um documento separado.

- [Guia de implantação do {{t('menu_svc_cms')}}](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
