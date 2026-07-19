# DAT (Data Authentication Token)

## 1. Visão Geral (Introduction)

À medida que o número de usuários conectados simultaneamente aumenta, o número de sessões (Session) também cresce, gerando uma carga excessiva nos servidores de sessão.

**DAT** é uma especificação de token projetada para resolver o problema de sobrecarga nos servidores de sessão e implementar uma autenticação eficiente sem compartilhamento de estado entre servidores (Stateless).

---

## 2. Estrutura do Token (Structure)

<Struct type="dat" />

### 2.1. Especificação Detalhada por Campo

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Representa o tempo de expiração do token como um inteiro de 64 bits sem sinal na unidade de segundos (Seconds).

`CID` : Hex (uint64)
- ID do certificado (Certificate ID) utilizado na validação do token.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Contém os dados a serem expostos publicamente ao cliente. Suporta não apenas strings, mas também dados binários, que podem ser decodificados e verificados pelo cliente.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Contém os dados a serem mantidos privados do cliente. São criptografados com um algoritmo de criptografia baseado em certificado, portanto o cliente não pode descriptografá-los.

`{{t('sig')}}` : Base64Url (Binary)
- Dados de assinatura para verificar a adulteração ou falsificação do token. São gerados assinando os campos anteriores com o algoritmo de assinatura do certificado.

---

## 3. Comparação com JWT

DAT e JWT (JSON Web Token) compartilham uma estrutura de token separada por pontos (`.`) e um método de verificação por meio de `signature`, mas possuem as seguintes diferenças fundamentais no design interno.

### 3.1. Comparação de Diferenças Estruturais

* **Estrutura JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Estrutura DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. Principais Diferenças

* **Otimização baseada em Binary:** O JWT trata o Header e o Body como strings JSON, enquanto o DAT **manipula dados binários (Binary) diretamente**, otimizando o tamanho dos dados e aumentando a eficiência de parsing.
* **Segurança integrada (campo `{{t('dat_secure')}} (secure)`):** O JWT por padrão expõe o Payload em texto simples, exigindo a aplicação de especificações separadas como JWE quando a criptografia é necessária. Em contrapartida, o DAT **suporta criptografia nativamente no próprio token por meio do campo `{{t('dat_secure')}}`**.
* **Expiração obrigatória:** No JWT, o campo `exp` (Claims) é opcional, mas no DAT o **campo `{{t('dat_expire')}} (expire)` é obrigatório na estrutura do token**, tornando a validação do prazo de validade imprescindível.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
