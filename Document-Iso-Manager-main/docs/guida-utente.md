# ISO Document Manager - Guida Utente

## Indice

1. [Introduzione](#introduzione)
2. [Accesso al sistema](#accesso-al-sistema)
3. [Navigazione dell'interfaccia](#navigazione-dellinterfaccia)
4. [Gestione documenti](#gestione-documenti)
5. [Sistema di alert e scadenze](#sistema-di-alert-e-scadenze)
6. [Documenti obsoleti](#documenti-obsoleti)
7. [Funzionalità amministrative](#funzionalità-amministrative)
8. [Risoluzione dei problemi](#risoluzione-dei-problemi)

## Introduzione

ISO Document Manager è un'applicazione progettata per archiviare ordinatamente tutta la documentazione di sistema secondo gli standard ISO, generando un indice documentale omogeneo rispetto all'indice della norma e garantendo la conformità normativa.

L'applicazione consente di:
- Gestire le scadenze contenute nei file Excel
- Dematerializzare la documentazione per un'immediata tracciabilità
- Organizzare i documenti secondo la struttura delle norme ISO
- Mantenere uno storico delle revisioni dei documenti

## Accesso al sistema

### Login

1. Accedi all'URL dell'applicazione fornito dall'amministratore
2. Inserisci il tuo nome utente e password
3. Seleziona l'opzione "Ricordami" se desideri rimanere connesso per 7 giorni
4. Fai clic su "Accedi"

### Recupero password

Se hai dimenticato la password:

1. Nella schermata di login, fai clic su "Password dimenticata?"
2. Inserisci la tua email nel modulo
3. Riceverai un'email con un link per reimpostare la password
4. Segui il link e imposta una nuova password

## Navigazione dell'interfaccia

### Home page

La home page presenta un indice organizzato di tutti i documenti disponibili, strutturati secondo i punti norma ISO. Inoltre, sono presenti diverse sezioni:

- **Dashboard**: Mostra statistiche e informazioni generali
- **Documenti in scadenza**: Evidenzia i documenti che richiedono attenzione
- **Documenti scaduti**: Mostra i documenti la cui scadenza è stata superata
- **Documenti obsoleti**: Contiene versioni precedenti dei documenti

### Barra laterale

La barra laterale consente di navigare tra le diverse sezioni dell'applicazione:

- **Home**: Torna alla pagina principale
- **Documenti**: Visualizza tutti i documenti
- **Obsoleti**: Accedi ai documenti obsoleti (solo amministratori)
- **Impostazioni**: Configura le preferenze utente
- **Log di audit**: Visualizza la cronologia delle attività (solo amministratori)

## Gestione documenti

### Visualizzazione documenti

Per aprire un documento:

1. Fai clic sul nome del documento nell'indice
2. Il documento verrà aperto in una nuova finestra o scaricato (in base al tipo di file)

### Relazioni tra documenti

I documenti possono avere relazioni gerarchiche:

- **Documento padre**: Un documento principale che fa riferimento ad altri
- **Documento figlio**: Un documento referenziato da un documento padre

L'interfaccia mostra queste relazioni:

1. Nella vista dettagliata di un documento, troverai una sezione "Documenti correlati"
2. I documenti padre e figlio sono collegati tramite link cliccabili

### Comprensione dell'indice documentale

I documenti sono organizzati secondo la struttura ISO:

- **Punti principali**: Numeri da 1 a 10 (es. "4. Contesto dell'organizzazione")
- **Sottopunti**: Formato x.y (es. "4.1 Comprendere l'organizzazione e il suo contesto")
- **Sotto-sottopunti**: Formato x.y.z (es. "4.1.1 Fattori esterni e interni")

## Sistema di alert e scadenze

### Identificazione degli alert

L'applicazione analizza i file Excel alla ricerca di date di scadenza nella cella A1. Gli alert sono visualizzati con indicatori colorati:

- **Triangolo giallo**: Documento in scadenza (entro 30 giorni)
- **Cerchio rosso**: Documento scaduto

### Gestione delle scadenze

Per gestire le scadenze:

1. Accedi alla sezione "Documenti in scadenza"
2. Fai clic su un documento per visualizzarlo
3. Aggiorna il documento come necessario
4. Carica una nuova revisione per aggiornare la scadenza

## Documenti obsoleti

### Accesso ai documenti obsoleti

Solo gli utenti amministratori possono accedere ai documenti obsoleti:

1. Fai clic su "Obsoleti" nella barra laterale
2. Seleziona il documento desiderato dall'elenco

### Comprensione del sistema di revisioni

Quando un documento viene aggiornato:

1. La versione precedente viene automaticamente spostata in "Obsoleti"
2. Solo la versione più recente rimane nell'indice principale
3. Tutte le revisioni precedenti sono accessibili nella sezione "Obsoleti"

## Funzionalità amministrative

### Gestione utenti

Come amministratore, puoi gestire gli utenti:

1. Accedi a "Impostazioni" > "Gestione utenti"
2. Crea, modifica o disattiva account utente
3. Assegna ruoli (Utente standard o Amministratore)

### Sincronizzazione con Google Drive

La sincronizzazione con Google Drive avviene automaticamente ogni 15 minuti. Per forzare una sincronizzazione manuale:

1. Accedi a "Impostazioni" > "Sincronizzazione"
2. Fai clic su "Sincronizza ora"

### Backup del sistema

Per eseguire un backup del sistema:

1. Accedi a "Impostazioni" > "Backup e ripristino"
2. Fai clic su "Crea backup"
3. Scarica il file di backup generato

## Risoluzione dei problemi

### Problemi di accesso

- **Non riesco ad accedere**: Verifica le credenziali o usa la funzione "Password dimenticata"
- **Sessione scaduta**: La sessione scade dopo 30 minuti di inattività (o 7 giorni se è stata selezionata l'opzione "Ricordami")

### Problemi con i documenti

- **Non vedo un documento appena caricato**: La sincronizzazione potrebbe non essere ancora avvenuta. Attendere o forzare una sincronizzazione manuale
- **Un alert non viene visualizzato**: Assicurarsi che la cella A1 del file Excel contenga una formula di data corretta

### Contattare il supporto

Per ulteriore assistenza:

1. Fai clic su "Assistenza" nel menu
2. Compila il modulo di contatto con i dettagli del problema
3. Il team di supporto risponderà via email entro 24 ore lavorative
