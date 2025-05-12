# ISO Document Manager

## Panoramica

ISO Document Manager è un'applicazione web avanzata progettata per la gestione e l'organizzazione di documenti conformi agli standard ISO. L'applicazione si integra con Google Drive e consente una gestione efficiente della documentazione aziendale, offrendo funzionalità complete per tracciare revisioni, scadenze e relazioni tra documenti.

## Caratteristiche principali

- **Organizzazione automatica dei documenti** in base ai punti norma ISO
- **Gestione delle revisioni** con archiviazione automatica delle versioni obsolete
- **Sistema di alert e notifiche** per documenti in scadenza con preavviso personalizzabile
- **Notifiche automatiche via email** per documenti in scadenza
- **Visualizzazione gerarchica** delle relazioni tra documenti (padre-figlio)
- **Integrazione con Google Drive** per sincronizzazione automatica dei documenti con supporto per incollare link completi
- **Sistema di codici aziendali** per registrazione utenti con ruoli predefiniti
- **Interfaccia responsive** ottimizzata per dispositivi mobili e desktop
- **Sistema di autenticazione sicuro** con recupero password
- **Protezione e crittografia** dei dati sensibili
- **Supporto multilingua** (attualmente italiano, espandibile)

## Funzionalità per gli amministratori

- **Gestione utenti** con assegnazione di ruoli (admin/viewer)
- **Gestione clienti** con supporto per incollare URL completi di Google Drive
- **Dashboard admin** con statistiche e stato del sistema
- **Log di audit** per tracciare tutte le azioni nel sistema
- **Gestione dei codici aziendali** per registrazione utenti
- **Configurazione notifiche** con periodo di preavviso personalizzabile per documento
- **Sincronizzazione manuale e automatica** con Google Drive

## Funzionalità per gli utenti

- **Visualizzazione documenti** organizzati secondo la gerarchia ISO
- **Ricerca avanzata** di documenti per titolo, percorso ISO, revisione
- **Download sicuro** dei documenti con verifica dell'integrità
- **Notifiche** per documenti in scadenza
- **Gestione profilo** con cambio password

## Tecnologie utilizzate

### Frontend
- React 18 con TypeScript
- TanStack Query per la gestione dello stato e chiamate API
- Tailwind CSS per lo styling responsivo
- shadcn/ui come libreria di componenti
- Autenticazione basata su sessioni con timeout configurabile

### Backend
- Node.js con Express
- MongoDB come database per dati e sessioni
- Integrazione con Google Drive API per sincronizzazione documenti
- Sistema di crittografia per documenti sensibili
- Nodemailer per invio email di notifica e recupero password
- Sistema di notifiche automatizzate per documenti in scadenza

## Configurazione di produzione

### Requisiti
- Node.js 18+
- MongoDB 5.0+
- Account SendGrid o altro provider SMTP per email
- Account di servizio Google Drive API (per sincronizzazione)

### Variabili d'ambiente richieste

- `PORT`: Porta su cui eseguire l'applicazione (default: 5000)
- `MONGODB_URI`: URI di connessione MongoDB
- `SESSION_SECRET`: Chiave per la crittografia delle sessioni
- `SMTP_HOST`: Host SMTP per invio email
- `SMTP_PORT`: Porta server SMTP
- `SMTP_USER`: Username SMTP
- `SMTP_PASSWORD`: Password SMTP 
- `SMTP_SECURE`: 'true' per connessioni sicure (TLS)
- `APP_URL`: URL pubblico dell'applicazione
- `ENCRYPTION_KEY`: Chiave per la crittografia dei file locali

### Installazione

1. Clona il repository
2. Installa le dipendenze: `npm install`
3. Configura le variabili d'ambiente in un file `.env`
4. Compila l'applicazione: `npm run build`
5. Avvia il server: `npm start`

## Utilizzo del sistema

### Accesso e registrazione

1. Gli utenti si registrano utilizzando un **codice aziendale** fornito dall'amministratore
2. Il codice aziendale determina automaticamente il ruolo utente (admin/viewer)
3. Gli admin possono creare nuovi codici aziendali con limite di utilizzi, data di scadenza e ruolo associato

### Sincronizzazione documenti

1. L'admin configura la cartella Google Drive da sincronizzare (supporta URL completi di Google Drive)
2. È possibile incollare direttamente l'URL completo della cartella Google Drive e il sistema estrarrà automaticamente l'ID della cartella
3. Supporta vari formati di URL: link standard, link con account specifico, link di tipo "open", e link my-drive
4. Il sistema analizza i documenti basandosi sulla nomenclatura file ISO (es. "8.2.1 Documento Rev.2")
5. La sincronizzazione automatica avviene ogni 15 minuti
6. È disponibile anche la sincronizzazione manuale immediata

### Notifiche di scadenza

1. Il sistema controlla quotidianamente i documenti in scadenza
2. Gli amministratori ricevono email di notifica per documenti in scadenza e scaduti
3. Gli amministratori possono configurare il periodo di preavviso per ciascun documento
4. L'interfaccia web mostra indicatori visivi per documenti in scadenza e scaduti

## Documentazione

Il progetto include una documentazione completa nella directory `docs/`:

- [Guida utente](docs/guida-utente.md): Per gli utenti finali dell'applicazione
- [Guida all'installazione](docs/guida-installazione.md): Per configurare l'applicazione in produzione
- [Guida sviluppatori](docs/guida-sviluppatori.md): Per chi desidera contribuire o estendere il progetto

## Backup e sicurezza

- Il sistema esegue backup automatici del database
- I documenti sensibili vengono criptati nella cache locale
- Tutti i file sono verificati tramite hash SHA-256 per garantirne l'integrità
- Il sistema supporta link sicuri temporanei per condivisione documenti

## Licenza

Questo progetto è rilasciato sotto licenza proprietaria. Tutti i diritti sono riservati.

## Contatti

Per domande o supporto, contattare support@isodocmanager.it
