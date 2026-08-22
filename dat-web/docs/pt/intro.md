
# DAT (Distributed Access Token)

---

## Contexto da Criação do DAT

Atualmente, muitos sistemas adotam o JWT, mas em ambientes de produção reais existem as seguintes limitações estruturais.<br/>
Para resolvê-las, foi projetada uma nova especificação de token: o DAT.

#### 🧩 Fragmentação das especificações de segurança e falta de obrigatoriedade
O JWT fornece padrões de criptografia como o JWE, mas seu uso não é obrigatório. <br/>
Por isso, muitos ambientes de desenvolvimento omitem a criptografia ou transmitem dados por métodos não padronizados, gerando vulnerabilidades de segurança.

#### 🔑 Risco de segurança pelo uso de chave estática (Static Key)
Como a rotação das chaves de assinatura (Key Rolling) não é obrigatória, é frequente que uma única chave seja usada por longos períodos. Isso pode levar ao colapso da segurança de todo o sistema em caso de roubo da chave e, de fato, já houve incidentes de violação por esse motivo em grandes sites de comércio eletrônico.

#### 📉 Degradação de desempenho por sobrecarga
O JWT passa por um processo de análise (parsing) JSON a cada requisição, consumindo recursos consideráveis de CPU. Em ambientes que exigem alto desempenho, esse custo de análise pode se tornar o gargalo geral do sistema.

---

## Filosofia central do DAT

O DAT foi projetado sob o princípio de que a segurança deve ser obrigatória e não opcional, e de que o desempenho não é negociável.

#### ⚡ Leve e rápido

<WireFormat
    hint="Passe o mouse sobre cada campo para ver a descrição."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de expiração. É imposto pela especificação e não pode ser omitido.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID do certificado a ser usado na verificação.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Dados expostos ao cliente.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Dados criptografados. Não podem ser lidos sem o certificado.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Assinatura sobre os quatro campos anteriores.'},
    ]"
/>

Como mostrado acima, o DAT possui apenas cinco campos fixos separados por ponto (`.`). Como a posição de cada campo é definida pela especificação, é possível recortar cada valor apenas localizando os separadores, sem análise JSON.

#### 🔐 Segurança imposta

O DAT separa fisicamente as regiões de texto simples (Plain) e **criptografada (Secure)** na transmissão de dados.<br/>
As informações sensíveis são obrigatoriamente criptografadas, e todo o processo é protegido por algoritmos padronizados declarados no certificado (ECDSA, AES-GCM, etc.).

O algoritmo de criptografia é **decidido pelo certificado**, não pelo token. Como o token não carrega informação de algoritmo, não existe a superfície de ataque de confusão de algoritmo que decorre do cabeçalho `alg` do JWT.

#### 🔄 Rotação de chaves imposta

O certificado DAT gerencia diretamente não apenas a emissão e a expiração dos tokens, mas também **o ciclo de vida das chaves**.<br/>
O certificado traz gravado, no nível da especificação, "de quando até quando é possível emitir"; passado esse período, não é possível criar novos tokens com aquele certificado. A situação em que, por descuido do administrador, uma única chave acaba sendo usada por anos não ocorre estruturalmente.

#### ⏱️ Separação entre janela de emissão e período de validade

"O período em que o certificado pode emitir tokens" e "o período em que o token emitido permanece vivo" são valores distintos.<br/>
Graças a isso, mesmo depois que o certificado para de emitir, os tokens já emitidos podem cumprir toda a sua vida útil, e nesse intervalo o cluster migra naturalmente para o próximo certificado.

---

## Comparação de mecanismos de autenticação

| Classificação | **DAT**                       | **JWT** | **Sessão**           |
| --- |-------------------------------| --- |---------------------------|
| **Método de autenticação** | **Verificação distribuída**                     | Verificação distribuída | Centralizado          |
| **Estrutura de dados** | **Raw Bytes<br/>(baseado em offset fixo)** | JSON<br/>(texto baseado em chave-valor) | Serialized Object<br/>(serialização de objeto) |
| **Mecanismo de análise** | **Mapeamento imediato dos dados em bytes**            | Requer análise JSON e type casting | Requer desserialização de objetos e I/O          |
| **Desempenho de processamento** | **Máximo (sobrecarga de análise mínima)**          | Moderado (depende do desempenho do processamento JSON) | Baixo (I/O de rede/disco)         |
| **Criptografia** | **Nativa**                     | Requer implementação separada de JWE (complexo) | Não aplicável                     |
| **Gerenciamento de chaves** | **Rotação imposta pelo sistema (segurança imposta)**         | Implementação própria (risco de descuido de gestão) | Não aplicável                     |
| **Validade da chave** | **Obrigatoriamente explícita na especificação da chave**              | Opcional (permanente se não houver gestão) | Gerenciada pelo servidor central                  |
| **Escolha do algoritmo** | **Decidida pelo certificado (ausente no token)**          | `alg` no cabeçalho do token | Não aplicável                     |
| **Momento de expiração** | **Campo obrigatório na especificação**                 | Claim opcional (`exp`) | Gerenciado pelo servidor                   |

---

## {{t('bench_title')}} {#performance}

<BenchBars />

---

## Próximos documentos

- [{{t('menu_spec_dat')}}](./spec/dat) — formato wire do token e regras canônicas
- [{{t('menu_spec_cert')}}](./spec/dat-certificate) — estrutura do certificado, algoritmos e ciclo de vida
- [{{t('menu_spec_cms')}}](./spec/cms) — distribuição de certificados e comportamentos que se deve conhecer na operação

<script setup lang="ts">
import {useTranslate} from "../.vitepress/src/langs";
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import BenchBars from "../.vitepress/ui/BenchBars.vue";
const {t} = useTranslate();
</script>
