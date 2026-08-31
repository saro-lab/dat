# DAT

Un DAT è una stringa ASCII delimitata da punti (`.`). Ogni campo compare una sola volta nell’ordine stabilito e la firma verifica che i campi precedenti siano rimasti identici ai byte trasmessi.

<WireFormat
  hint="L’ordine dei campi e i separatori fanno parte della specifica."
  :segments="[
    {name: 'expire', type: 'uint64 (decimale)', kind: 'meta', note: 'Data di scadenza Unix'},
    {name: 'cid', type: 'uint64 (esadecimale)', kind: 'meta', note: 'ID del certificato'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte pubblici'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte cifrati'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Firma dei quattro campi precedenti'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Campi

| Campo | Rappresentazione | Significato |
| --- | --- | --- |
| `expire` | Decimale di un intero senza segno | Data Unix di scadenza del DAT |
| `cid` | Esadecimale minuscolo di un intero senza segno | ID del certificato usato per la verifica |
| `plain` | Base64Url senza padding | Byte non cifrati |
| `secure` | Base64Url senza padding | Byte protetti dall’algoritmo crittografico del certificato |
| `signature` | Base64Url senza padding | Firma dei byte ASCII originali di `expire.cid.plain.secure` |

`plain` è incluso nella firma e quindi non può essere alterato, ma chiunque può decodificarlo. Segreti, dati personali e valori usati direttamente per l’autorizzazione devono essere inseriti in `secure`. Un campo `secure` vuoto è valido.

## Rappresentazione canonica

- L’intero DAT deve essere ASCII.
- I numeri sono scritti senza segno, spazi, prefissi o zeri iniziali superflui. Solo il valore zero è scritto `0`.
- Base64Url usa l’alfabeto sicuro per URL e non ammette padding `=` né spazi.
- Le rappresentazioni Base64Url non canoniche degli stessi byte vengono rifiutate.
- Se il numero o l’ordine dei campi è diverso, la stringa non è un DAT.

Queste regole impediscono che implementazioni diverse accettino stringhe differenti come lo stesso DAT.

## Emissione

1. Selezionare un certificato attualmente utilizzabile per l’emissione.
2. Sommare il TTL del certificato all’ora corrente per ottenere `expire`.
3. Codificare `plain` in Base64Url.
4. Cifrare `secure` con l’algoritmo crittografico del certificato.
5. Firmare i byte ASCII ottenuti collegando con punti i campi precedenti.

L’emissione è consentita solo nell’intervallo inclusivo `start <= now <= start + duration` del certificato.

## Verifica

1. Analizzare il DAT secondo le regole canoniche.
2. Verificare che `expire > now`. Se `expire == now`, il DAT è scaduto.
3. Trovare il certificato associato a `cid` e verificare che sia ancora valido per la verifica.
4. Verificare la firma sui byte originali `expire.cid.plain.secure`.
5. Autenticare e decifrare `secure`, quindi restituirlo insieme a `plain`.

Le API di analisi che non verificano la firma servono solo per osservazione o diagnostica. I loro risultati non devono essere usati per autenticare o autorizzare.

## Responsabilità esterne alla specifica

DAT non definisce l’archivio utenti, il metodo di accesso, il modello di autorizzazione, l’header di trasporto del token né una lista di revoca. È l’applicazione a decidere per quali richieste accettare un payload verificato.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
