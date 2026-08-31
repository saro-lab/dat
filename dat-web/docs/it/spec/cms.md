# DAT CMS

DAT CMS è un servizio facoltativo che genera, conserva e distribuisce i certificati ai gestori client. Questo documento descrive il contratto di sincronizzazione tra client e server. Per installazione e gestione consultare la [guida al servizio DAT CMS](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Sincronizzazione dei certificati"
  :actors="[
    {id: 'client', label: 'Client', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Richiesta di versione e certificati correnti', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Risposta con versione e certificati', kind: 'res'},
    {from: 'client', label: 'Verifica completa e applicazione atomica', kind: 'note'},
  ]"
/>

## Endpoint per ruolo

| Ruolo | Percorso | Uso |
| --- | --- | --- |
| Recupero certificati completi | `GET /v1/certs?version=<n>` | Servizi che emettono DAT |
| Recupero certificati di sola verifica | `GET /v1/certs/verify-only?version=<n>` | Servizi che verificano e decifrano soltanto |
| Registrazione del certificato | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Operatore o processo di generazione |

Il recupero completo e quello di sola verifica possono essere protetti da ruoli token differenti. Impostare l’opzione `verifyOnly` del gestore client affinché un servizio di sola verifica non richieda certificati completi.

## Cursore di versione

Il client invia al server l’ultima versione applicata. Se lo stato del server è invariato, non è necessario inviare nuovamente i certificati. In presenza di un nuovo stato, la prima riga della risposta contiene la versione e le righe successive i certificati.

Se una risposta riuscita contiene soltanto la versione, i certificati e l’emittente esistenti vengono conservati. Una risposta con versione del server inferiore a quella del client non ripristina uno stato precedente e viene trattata come errore.

## Regole di importazione

- Se lo stesso `cid` compare più volte nella risposta, l’intera risposta viene rifiutata.
- Se un `cid` ricevuto coincide con uno già presente, viene conservato il certificato esistente.
- Lo stato viene applicato in una sola operazione dopo aver analizzato e verificato tutti i certificati.
- Non rimane mai uno stato in cui solo alcuni certificati sono stati importati.
- Tra i certificati attualmente utilizzabili per l’emissione viene scelto un emittente appropriato.

## Sincronizzazione iniziale e manuale

Nella maggior parte delle librerie, la prima sincronizzazione durante la creazione del gestore è best-effort. Anche se fallisce, il gestore viene creato e conserva l’ultimo errore concreto. Se l’avvio dell’applicazione deve fallire, chiamare l’API di sincronizzazione immediata della libreria e propagare l’errore al chiamante.

Negli ambienti senza sincronizzazione automatica si può disabilitare l’intervallo ed eseguire la sincronizzazione quando serve. Se la sincronizzazione automatica è attiva, chiudere o arrestare il gestore durante lo spegnimento dell’applicazione.

## Rete ed errori

Configurare i timeout di connessione e dell’intera richiesta per l’ambiente di produzione. Le politiche di reindirizzamento variano tra runtime, quindi consultare la documentazione della libreria. Le risposte CMS non 2xx sono attualmente classificate dai client come errori `DAT_CMS_*` in base allo stato HTTP; il codice dettagliato del JSON del server non viene conservato.

Durante un guasto temporaneo dell’archivio, il server può fornire l’ultima istantanea di certificati riuscita. Se non esiste ancora un’istantanea valida, risponde con `DAT_STORE_UNAVAILABLE`.

## Documentazione del servizio

Distribuzione, database, token di accesso e configurazione di esecuzione sono descritti nella [guida al servizio DAT CMS](../svc/docker-saro-lab-dat-cms).

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
