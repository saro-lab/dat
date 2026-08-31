# Vibe coding con l’AI

Fornendo all’AI il contesto del progetto e il comportamento desiderato è più semplice integrare DAT. Negli esempi seguenti, sostituisci indirizzi e nomi delle variabili d’ambiente con quelli del tuo progetto.

## Implementazione semplice

Questa richiesta serve per creare rapidamente una struttura di base.

```text
Uso Kotlin e Spring Boot.
Aggiungi l’autenticazione DAT a Spring Security.

Per prima cosa leggi https://dat.saro.me/llms.txt
e consulta la specifica DAT e l’uso della libreria ufficiale.

Verifica il Bearer token nell’header Authorization
e, se l’autenticazione riesce, inserisci i dati dell’utente nel SecurityContext.

Questo server non emette DAT: esegue solo la verifica.
Deve ottenere da DAT CMS certificati di sola verifica.

Cerca prima nel progetto l’indirizzo del server CMS e la configurazione del token.
Se non li trovi, chiedimeli. Non inventare valori.

Usa la libreria DAT ufficiale per Java/Kotlin
e rispetta la struttura e lo stile del progetto esistente.
```

## Implementazione dettagliata

Questa richiesta specifica con precisione il flusso di autenticazione e la gestione degli errori.

```text
Il progetto usa Kotlin, Spring Boot e Spring Security.
Esamina la configurazione di sicurezza attuale e aggiungi l’autenticazione DAT.

Per prima cosa leggi https://dat.saro.me/llms.txt
e consulta la specifica DAT, la sincronizzazione dei certificati e l’API della libreria ufficiale.

Requisiti:

- Leggere il DAT dall’header Authorization: Bearer.
- Se il DAT è assente, continuare come richiesta anonima.
- Se il DAT non è valido o è scaduto, rispondere con 401.
- Dopo una verifica riuscita, inserire ID utente e autorizzazioni nel SecurityContext.
- Leggere da plain soltanto i valori che possono essere pubblici.
- Leggere ID utente e autorizzazioni dai dati secure verificati.
- Poiché il server esegue solo la verifica, usare i certificati verify-only di DAT CMS.
- Ricevere indirizzo CMS e token tramite variabili d’ambiente.
- Se la sincronizzazione dei certificati fallisce all’avvio, impedire l’avvio dell’applicazione.
- Aggiornare automaticamente i certificati durante l’esecuzione e chiudere il gestore allo spegnimento.
- Distinguere le cause di errore tramite i codici DAT, non tramite i messaggi.
- Non registrare nei log il DAT originale, il token CMS o dati personali.

Prima esamina la configurazione Spring Security e la struttura di utenti e autorizzazioni del progetto.
Se non puoi determinare indirizzo CMS, variabili d’ambiente del token o formato dei dati secure, fai domande prima di implementare.
Usa esclusivamente l’API pubblica della libreria DAT ufficiale per Java/Kotlin.

Prima di modificare il codice, descrivi brevemente il flusso di autenticazione e i file da cambiare.
```

## Quale esempio scegliere?

- Per ottenere rapidamente codice eseguibile, usa **Implementazione semplice**.
- Per un flusso di autenticazione destinato alla produzione, usa **Implementazione dettagliata**.

Se l’AI pone domande, indica prima l’indirizzo CMS, i nomi delle variabili d’ambiente che contengono i token e i dati utente presenti in `secure`.
