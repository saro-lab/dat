# Guia de programação com IA

## Exemplo de vibe coding

```
Aplique o DAT à autenticação de sessão deste servidor web.
É um token de acesso distribuído como o JWT, e a documentação está em https://dat.saro.me/llms.txt
Leia a documentação primeiro. Baixe todo o conjunto de documentos llms para a pasta docs/dat e atualize também a documentação do agente.

- Projeto: Java Spring Boot, usando Spring Security
- Objetivo: substituir a sessão pelo DAT
- Servidor DAT-CMS: http://localhost:8088 - mova esse valor para as properties
- Algoritmo de assinatura: HMAC-SHA512-MFS
- Algoritmo de criptografia: IV-AES256-GCM
- Valores padrão para todo o resto

Não invente APIs que não estejam na documentação.
```


## Algoritmos

### Assinatura

| Algoritmo | Características |
| --- |---|
| `HMAC-SHA256-MFS`<br/>`HMAC-SHA384-MFS`<br/>`HMAC-SHA512-MFS` | · Baseado em hash<br/>· Chave simétrica<br/>· Rápido<br/>· [HMAC](https://en.wikipedia.org/wiki/HMAC) |
| `ECDSA-P256`<br/>`ECDSA-P384`<br/>`ECDSA-P521` | · Baseado em curva elíptica<br/>· Chave assimétrica<br/>· Segurança obtida em troca de velocidade<br/>· [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) |

- O HMAC é **muito mais rápido**, portanto, se o que importa é apenas impedir ataques externos, o HMAC é a escolha recomendada.
  - [Ver os benchmarks por algoritmo e linguagem](./intro#performance)
- O ECDSA permite manter o servidor de emissão separado dos servidores de verificação, graças à sua estrutura de chave pública. Em um sistema de grande porte, no qual autoridade e papéis já estão bem separados, isso reforça a segurança contra ataques internos.

### Criptografia

| Nome | Comprimento da chave |
| --- |---|
| `IV-AES128-GCM` | 128 bits |
| `IV-AES256-GCM` | 256 bits |

- Os dados que o DAT criptografa são curtos, de modo que quase não há diferença mensurável entre 128 bits e 256 bits.
- O AES praticamente não consome recursos, portanto recomenda-se 256 bits pela margem de segurança adicional.


## Servidor DAT-CMS

**[Instalar o DAT-CMS](./svc/docker-saro-lab-dat-cms)**

O DAT-CMS não é obrigatório, mas sua instalação é fortemente recomendada quando é preciso distribuir certificados por vários servidores e automatizar a rotação de chaves.

## Próximos documentos

- [O que é o DAT?](./intro) - o contexto do projeto do DAT
- [Especificação do DAT](./spec/dat) - o formato wire do token
- [Todas as bibliotecas](./libs/) - instalação e exemplos por linguagem
