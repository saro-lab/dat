# Vibe coding com AI

Você pode aplicar o DAT com mais facilidade se explicar à AI o projeto atual e o comportamento desejado. Nos exemplos abaixo, substitua apenas o endereço e os nomes das variáveis de ambiente pelos usados no seu projeto.

## Implementação simples

Use esta solicitação quando quiser criar rapidamente a estrutura básica.

```text
Uso Kotlin e Spring Boot.
Adicione autenticação DAT ao Spring Security.

Primeiro, leia https://dat.saro.me/llms.txt e consulte
a especificação do DAT e o uso da biblioteca oficial.

Verifique o Bearer token no cabeçalho Authorization e,
se a autenticação for bem-sucedida, adicione as informações do usuário ao SecurityContext.

Este servidor não emite DAT; ele apenas os verifica.
Ele deve obter certificados exclusivos para verificação no DAT CMS.

Procure primeiro no projeto o endereço do servidor CMS e a configuração do token.
Se não encontrar, pergunte a mim. Não invente valores.

Use a biblioteca DAT oficial para Java/Kotlin e implemente
de acordo com a estrutura e o estilo de código atuais do projeto.
```

## Implementação detalhada

Use esta solicitação quando quiser especificar com precisão o método de autenticação e o tratamento de erros.

```text
Este projeto usa Kotlin, Spring Boot e Spring Security.
Revise a configuração de segurança atual e adicione autenticação DAT.

Primeiro, leia https://dat.saro.me/llms.txt e consulte
a especificação do DAT, o método de sincronização de certificados e a API da biblioteca oficial.

As condições de implementação são as seguintes.

- Leia o DAT do cabeçalho Authorization: Bearer.
- Se não houver DAT, continue como uma solicitação anônima.
- Se o DAT for inválido ou tiver expirado, responda com 401.
- Se a verificação for bem-sucedida, adicione o ID e as permissões do usuário ao SecurityContext.
- Leia de plain apenas os valores que podem ser públicos.
- Leia o ID e as permissões do usuário nos dados secure verificados.
- Este servidor apenas verifica, então use certificados verify-only do DAT CMS.
- Receba o endereço do CMS e o token por variáveis de ambiente.
- Se a sincronização de certificados falhar na inicialização, impeça também a inicialização da aplicação.
- Atualize os certificados automaticamente durante a execução e feche o gerenciador ao encerrar.
- Diferencie a causa da falha pelo código de erro DAT, não pela mensagem de erro.
- Não registre o DAT original, o token do CMS nem dados pessoais.

Primeiro, revise a configuração do Spring Security e a estrutura de usuários e permissões do projeto.
Se não for possível determinar o endereço do CMS, as variáveis de ambiente do token ou o formato dos dados secure, pergunte antes de implementar.
Use apenas a API pública da biblioteca DAT oficial para Java/Kotlin.

Antes de alterar o código, explique brevemente o fluxo de autenticação e os arquivos que serão modificados.
```

## Qual exemplo escolher?

- Se quiser começar com um código que possa ser executado, use **Implementação simples**.
- Se precisar de um fluxo de autenticação para um ambiente de produção, use **Implementação detalhada**.

Se a AI fizer perguntas, comece informando o endereço do CMS, o nome da variável de ambiente que contém o token e as informações do usuário armazenadas em `secure`.
