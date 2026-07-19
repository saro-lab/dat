# DAT (Distributed Access Token)

---

## Contexto da Introdução do DAT

Atualmente, muitos sistemas adotam JWT, porém existem limitações estruturais em ambientes de produção reais como a seguir.<br/>
Para resolver esses problemas, a nova especificação de token, DAT, foi projetada.

#### 🧩 Fragmentação das Especificações de Segurança e Falta de Aplicação

JWT fornece padrões de criptografia como JWE, mas seu uso não é obrigatório. <br/>
Como resultado, muitos ambientes de desenvolvimento omitem a criptografia ou transmitem dados usando métodos não padronizados, levando a vulnerabilidades de segurança.

#### 🔑 Riscos de Segurança pelo Uso de Chave Estática

Como a rotação de chaves de assinatura não é obrigatória, chaves únicas são frequentemente usadas por longos períodos. Isso pode levar ao colapso total da segurança do sistema se uma chave for comprometida; de fato, incidentes de violação causados por isso já ocorreram em sites de e-commerce de grande escala.

#### 📉 Degradação de Desempenho por Sobrecarga

JWT passa por um processo de análise JSON para cada requisição, o que consome recursos significativos de CPU. Em ambientes de alto desempenho, esse custo de análise pode se tornar um grande gargalo para todo o sistema.


## Filosofia Central do DAT

DAT é projetado sob os princípios de que a segurança deve ser obrigatória e não opcional, e que o desempenho não pode ser comprometido.

#### ⚡ Leve e Rápido

```expire```.```cid```.```plain```.```secure```.```signature```

DAT possui uma estrutura de dados leve como mostrado acima.

#### 🔐 Segurança Aplicada

DAT separa fisicamente as regiões de texto simples (Plain) e **criptografado (Secure)** durante a transmissão de dados.<br/>
Informações sensíveis devem obrigatoriamente ser criptografadas, e todo o processo é protegido por algoritmos padronizados (P256, AES-GCM, etc.) via `DatKey`.

#### 🔄 Rotação de Chaves Aplicada

`DatKey`, o núcleo do sistema DAT, gerencia diretamente **o ciclo de vida das chaves**, bem como a emissão e expiração de tokens.<br/>
É projetado para rotacionar chaves periodicamente no nível do sistema, prevenindo fundamentalmente 'incidentes de segurança com chave estática' causados por descuido do administrador.

---

## Comparação de Mecanismos de Autenticação

| Classificação | **DAT** | **JWT** | **Sessão** |
| --- |-------------------------------| --- |---------------------------|
| **Método de Autenticação** | **Verificação Distribuída** | Verificação Distribuída | Centralizado |
| **Estrutura de Dados** | **Raw Bytes<br/>(Fixed Offset-Based)** | JSON<br/>(Key-Value Text-Based) | Serialized Object<br/>(Object Serialization) |
| **Mecanismo de Análise** | **Mapeamento Imediato de Dados em Bytes** | Requer Análise JSON e Type Casting | Requer Desserialização de Objetos e I/O |
| **Desempenho de Processamento** | **Mais Alto (Sobrecarga de Análise Mínima)** | Moderado (Dependente do Desempenho de Processamento JSON) | Baixo (Network/Disk I/O) |
| **Criptografia** | **Integrada por Padrão** | Requer Implementação Separada de JWE (Complexo) | Não Aplicável |
| **Gerenciamento de Chaves** | **Rotação de Sistema Aplicada (Segurança Aplicada)** | Requer Implementação Direta (Risco de Gerenciamento Descuidado) | Não Aplicável |
| **Período de Validade da Chave** | **Aplicado e Explícito na Especificação da Chave** | Opcional (Permanente se Não Gerenciado) | Gerenciado pelo Servidor Central |
