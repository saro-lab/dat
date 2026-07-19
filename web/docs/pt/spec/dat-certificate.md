# Certificado DAT

## 1. Visão Geral (Introduction)

O **Certificado DAT** é uma especificação destinada a controlar a autoridade de emissão do DAT (Data Authentication Token) e gerenciar as informações de algoritmos de assinatura e criptografia, bem como as chaves (Key) do token.

Cada certificado possui um ID exclusivo (`CID`) e gerencia com segurança o ciclo de vida do token ao impor o período de emissão permitido do DAT e o prazo de validade padrão (TTL) dos tokens gerados.

---

## 2. Estrutura do Certificado (Structure)

<Struct type="cert" />


### 2.1. Especificação Detalhada por Campo

`CID` : Hex (uint64)

* ID exclusivo do certificado que o identifica. É mapeado com o campo `CID` do DAT para determinar qual certificado usar durante a validação.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Representa o **tempo de início** a partir do qual o DAT pode ser emitido usando este certificado, expresso em segundos (Seconds).

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* É o **período de validade de emissão** do certificado. Após decorrido este período (em segundos) a partir de `{{t('dat_issue_start')}}`, novos DATs não poderão ser emitidos com este certificado.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* É o prazo de validade padrão (Time To Live) dos DATs emitidos com este certificado. Ao criar um DAT, o valor `expire` é definido somando-se `dat-ttl` ao horário de emissão (horário atual).

`{{t('sig_alg')}}` : String / Enum

* É o **algoritmo de assinatura** a ser utilizado para gerar e verificar o campo `signature` do DAT.

`{{t('crypto_alg')}}` : String / Enum

* É o **algoritmo de criptografia** a ser utilizado para criptografar e descriptografar o campo `secure` do DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* Dados de chave utilizados para assinatura e verificação. (Dependendo do algoritmo, pode ser a Public/Private Key de uma chave assimétrica ou uma chave simétrica.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Dados de chave criptográfica utilizada para criptografar e descriptografar o campo `secure`.

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

Lista de algoritmos de assinatura para prevenção de adulteração ou falsificação do DAT.

Suporta os métodos de chave simétrica e chave assimétrica.

<br/>

**`ECDSA-P256`**
- Algoritmo de Assinatura Digital de Curva Elíptica (NIST secp256r1)


**`ECDSA-P384`**
- Algoritmo de Assinatura Digital de Curva Elíptica (NIST secp384r1)


**`ECDSA-P521`**
- Algoritmo de Assinatura Digital de Curva Elíptica (NIST secp521r1)


**`HMAC-SHA256-MFS`**
- Keyed-Hashing baseado em chave secreta de tamanho fixo (MFS) de 256 bits


**`HMAC-SHA384-MFS`**
- Keyed-Hashing baseado em chave secreta de tamanho fixo (MFS) de 384 bits


**`HMAC-SHA512-MFS`**
- Keyed-Hashing baseado em chave secreta de tamanho fixo (MFS) de 512 bits



> **MFS (Maximum Fixed Secret):** Método que utiliza uma chave secreta de tamanho fixo com o mesmo número de bits que o tamanho de saída (Output) do algoritmo de hash.

---

### {{t('crypto_alg')}}

Lista de algoritmos de criptografia autenticada (Authenticated Encryption) para proteger os dados confidenciais internos do DAT (campo `secure`).

O resultado da criptografia tem o formato combinado de IV e dados criptografados para prevenção de descriptografia e ataques de reutilização.

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- Modo AES-GCM com chave de 128 bits


**`IV-AES256-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- Modo AES-GCM com chave de 256 bits


> **Incorporação do IV (Initialization Vector):** Para prevenir ataques de reutilização (Replay Attack), um NONCE (IV) exclusivo de 96 bits gerado a cada criptografia é combinado como prefixo (Prefix) antes dos dados criptografados e incluído no binário. Durante a descriptografia, os primeiros 96 bits são separados como IV para realizar a descriptografia.


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
