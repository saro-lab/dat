# Codici di errore

Le implementazioni DAT forniscono codici di errore stabili separati dai messaggi leggibili. Il programma deve decidere il comportamento usando il codice e la categoria di nuovo tentativo, senza confrontare il testo del messaggio.

## Come leggerli

```text
DAT_<area>_<causa>
```

| Prefisso | Area |
| --- | --- |
| `DAT_TOKEN_` | Stringa DAT e scadenza |
| `DAT_CERT_` | Stringa e stato del certificato |
| `DAT_SIG_` | Firma e verifica |
| `DAT_CRYPTO_` | Cifratura e decifratura |
| `DAT_KEY_` | Formato e autorità delle chiavi |
| `DAT_MANAGER_` | Gestore dei certificati |
| `DAT_CONFIG_` | Argomenti e configurazione |
| `DAT_INTERNAL_` | Funzioni interne del runtime |
| `DAT_CMS_` | Sincronizzazione del client CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Server CMS |

`_UNKNOWN` si usa soltanto per errori che non possono essere classificati con un altro codice nella stessa area. La stessa causa mantiene lo stesso nome anche in aree differenti.

## Categorie di nuovo tentativo

| Categoria | Significato | Gestione |
| --- | --- | --- |
| Temporaneo | Può riuscire quando lo stato esterno torna disponibile | Riprovare un numero limitato di volte con backoff |
| Stato | Può riuscire dopo una sincronizzazione dei certificati o un cambiamento dell’ora | Aggiornare lo stato necessario e riprovare |
| Permanente | Fallirà di nuovo con lo stesso input | Correggere input, configurazione o codice |

## Token e certificati

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
Il numero dei campi, i numeri o la rappresentazione Base64Url del DAT non rispettano la specifica. Scartare l’input.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
La data di scadenza del DAT è uguale o precedente all’ora corrente. È necessario ottenere un nuovo DAT.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
La struttura o la rappresentazione dei campi della stringa del certificato non è valida.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Non è presente un certificato corrispondente al `cid` del DAT. Controllare lo stato della sincronizzazione.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Il certificato potrebbe non essere ancora arrivato al servizio. Sincronizzare subito e valutare nuovamente.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
L’istante iniziale del certificato non è ancora arrivato. Controllare l’orologio di sistema e i tempi di distribuzione.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Il periodo di verifica del certificato è terminato.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
Lo stesso `cid` compare più volte in un singolo elenco di importazione. L’intera importazione viene rifiutata.
</ErrorCode>

## Firma, crittografia e chiavi

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
La firma non corrisponde al contenuto. Il DAT è stato alterato oppure è stato firmato con un’altra chiave.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
Il tag di autenticazione AES-GCM non corrisponde. Verificare un’alterazione del testo cifrato o un certificato errato.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
La lunghezza, il formato o la combinazione di algoritmi della chiave non è valida.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Si è tentato di emettere un DAT con un certificato di sola verifica. Il servizio emittente richiede un certificato completo.
</ErrorCode>

`DAT_SIG_MISMATCH` e `DAT_CRYPTO_TAG_MISMATCH` sono gli errori classificati come veri eventi dall’API pubblica degli eventi di sicurezza. Un singolo input errato non costituisce un guasto del servizio, ma la ripetizione va trattata come segnale di sicurezza.

## Gestore e configurazione

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Il gestore non contiene certificati. Importare i certificati o completare la sincronizzazione CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Esistono certificati, ma nessun certificato completo è attualmente utilizzabile per l’emissione. Controllare nella catena delle cause scadenza, istante iniziale e stato verify-only.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Un argomento o un valore di configurazione è fuori dall’intervallo consentito.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
La piattaforma corrente non offre la funzione crittografica o di rete richiesta.
</ErrorCode>

## Client CMS

| Codice | Significato | Gestione abituale |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Formato URI del CMS non valido | Correggere la configurazione |
| `DAT_CMS_UNAUTHORIZED` | Autenticazione non riuscita | Correggere il token |
| `DAT_CMS_FORBIDDEN` | Il ruolo non dispone dell’autorizzazione | Controllare il ruolo del token |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Percorso assente o diverso | Controllare indirizzo e percorso del CMS |
| `DAT_CMS_NETWORK` | Connessione o trasferimento non riuscito | Controllare la rete e applicare backoff |
| `DAT_CMS_TIMEOUT` | Tempo limite superato | Regolare rete e timeout |
| `DAT_CMS_SERVER_ERROR` | Errore del server CMS | Controllare il server e applicare backoff |
| `DAT_CMS_RESPONSE_INVALID` | Formato della risposta riuscita non valido | Controllare il contratto tra server e client |
| `DAT_CMS_VERSION_RESET` | La versione del server è retrocessa | Controllare dati e distribuzione del CMS |
| `DAT_CMS_IMPORT_FAILED` | Impossibile applicare i certificati ricevuti | Esaminare la catena delle cause |
| `DAT_CMS_STOPPED` | Uso di un gestore già arrestato | Creare un nuovo gestore o correggere l’ordine delle chiamate |

Le librerie con sincronizzazione iniziale best-effort conservano l’errore nell’apposito campo dell’ultimo errore. Se l’avvio deve fallire, usare l’API di sincronizzazione immediata che restituisce o genera direttamente l’errore.

## Server CMS

| Codice | HTTP | Significato |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Token assente o non valido |
| `DAT_AUTH_FORBIDDEN` | 403 | Il ruolo del token non corrisponde all’autorizzazione richiesta |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Nome dell’algoritmo non supportato |
| `DAT_REQ_NOT_FOUND` | 404·405 | Percorso o metodo non corrispondente |
| `DAT_REQ_TOO_LARGE` | 413 | Codice riservato al superamento del limite del corpo |
| `DAT_STORE_UNAVAILABLE` | 503 | Archivio temporaneamente non disponibile |
| `DAT_STORE_UNKNOWN` | 500 | Errore non classificato durante l’elaborazione dell’archivio |

I client attuali non espongono direttamente il codice del server nel JSON non 2xx: convertono lo stato HTTP in un codice `DAT_CMS_*`. Il codice nel log del server può quindi differire da quello segnalato dal client.

## Controllo per linguaggio

| Ambiente | Codice di errore | Categoria di nuovo tentativo |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Gli errori con una causa sottostante possono essere esaminati tramite la catena delle eccezioni o l’API per le cause del linguaggio.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
