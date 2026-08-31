# Che cos’è DAT?

DAT (Distributed Access Token) è una specifica per token di accesso condivisa da un servizio emittente e da un servizio di verifica che utilizzano gli stessi certificati. Poiché la verifica non richiede una nuova richiesta al servizio emittente o a un archivio centrale delle sessioni, il risultato dell’autenticazione può essere trasmesso riducendo l’accoppiamento tra i servizi.

<WireFormat
  hint="I campi separati da punti costituiscono un singolo DAT."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Data di scadenza Unix'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID del certificato'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Dati pubblici'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Dati cifrati'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Firma del contenuto'},
  ]"
/>

## Componenti

### DAT

È la stringa che un utente o un servizio invia insieme alla richiesta. Contiene la data di scadenza e l’ID del certificato e può includere sia dati pubblici sia dati cifrati.

### Certificato

Contiene gli algoritmi, le chiavi e gli intervalli temporali necessari per creare e verificare un DAT. Il suo ID, `cid`, è immutabile: per sostituire le chiavi si usa un nuovo `cid`.

### Gestore

Il gestore della libreria client conserva i certificati, crea DAT con un certificato attualmente utilizzabile per l’emissione e verifica ogni DAT con il certificato indicato dal suo `cid`.

### DAT CMS

È un server facoltativo che genera, conserva e distribuisce i certificati. Può fornire certificati completi ai servizi emittenti e certificati di sola verifica ai servizi che eseguono esclusivamente la verifica.

## Emissione e verifica

<ArchFlow
  :user="{label: 'Utente', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Gestione dei certificati', 'Sincronizzazione basata sulla versione']}"
  :service="{servers: [
    {label: 'Servizio emittente', kind: 'issuer', icon: 'login', request: 'Dati di autenticazione', response: 'DAT', sync: 'Certificato completo'},
    {label: 'Servizio di verifica', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Funzione protetta', sync: 'Certificato di sola verifica'},
  ]}"
/>

Il servizio emittente sceglie i dati `plain` e `secure` e crea il DAT. Il servizio di verifica controlla scadenza, firma e testo cifrato, quindi consegna entrambe le aree dati all’applicazione. `plain` è firmato ma non cifrato: non vi si devono inserire segreti o dati personali.

## Perché la verifica continua dopo la sostituzione del certificato

Quando un nuovo certificato diventa utilizzabile per l’emissione, i DAT successivi usano il nuovo `cid`. Il certificato precedente resta disponibile per la verifica fino alla scadenza del TTL di tutti i DAT già emessi. In questo modo la rotazione delle chiavi convive con il periodo di verifica dei token esistenti.

## Ambienti adatti

- Sistemi in cui autenticazione e funzionalità applicative sono gestite da servizi distinti
- Sistemi con runtime diversi che emettono o verificano lo stesso token
- Sistemi che trasmettono autorizzazioni di breve durata senza consultare un archivio centrale delle sessioni
- Sistemi che devono separare in un unico token le informazioni pubbliche di instradamento dai dati protetti

DAT non definisce la politica di autorizzazione. La validità di un DAT e la decisione dell’applicazione di consentire una richiesta sono due questioni distinte.

## Documenti successivi

- [Specifica DAT](./spec/dat): campi del token e regole di verifica
- [Certificati](./spec/dat-certificate): chiavi e intervalli temporali
- [Specifica DAT CMS](./spec/cms): contratto di sincronizzazione
- [Librerie](./libs/): integrazione nell’applicazione

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
