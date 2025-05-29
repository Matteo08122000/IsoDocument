# ISO Document Manager - Guida all'Installazione e Configurazione

## Indice

1. [Requisiti di sistema](#requisiti-di-sistema)
2. [Installazione](#installazione)
3. [Configurazione](#configurazione)
4. [Integrazione con Google Drive](#integrazione-con-google-drive)
5. [Configurazione del server email](#configurazione-del-server-email)
6. [Backup e ripristino](#backup-e-ripristino)
7. [Risoluzione dei problemi](#risoluzione-dei-problemi)

## Requisiti di sistema

### Requisiti minimi hardware

- CPU: 2 core
- RAM: 2 GB
- Spazio su disco: 500 MB (escludendo lo spazio per i documenti)

### Software necessario

- Node.js (v16 o superiore)
- MongoDB (v4.4 o superiore)
- Account Google per l'integrazione con Google Drive

## Installazione

### Tramite repository

1. Clona il repository:

   ```bash
   git clone https://github.com/your-repo/iso-document-manager.git
   cd iso-document-manager
   ```

2. Installa le dipendenze:

   ```bash
   npm install
   ```

3. Configura le variabili d'ambiente copiando il file .env.example:

   ```bash
   cp .env.example .env.production
   ```

4. Modifica il file .env.production con i valori appropriati (vedi sezione [Configurazione](#configurazione))

5. Avvia l'applicazione in modalità produzione:
   ```bash
   npm run start:prod
   ```

### Tramite Docker

1. Assicurati che Docker e Docker Compose siano installati

2. Configura le variabili d'ambiente in un file .env.production

3. Avvia i container:
   ```bash
   docker-compose up -d
   ```

## Configurazione

### Variabili d'ambiente

Il file `.env.production` contiene tutte le configurazioni necessarie per l'ambiente di produzione. Di seguito i parametri principali:

#### Configurazione dell'applicazione

```
# Configurazione applicazione
NODE_ENV=production
PORT=5000

# Chiave di crittografia (deve essere di 32 caratteri)
ENCRYPTION_KEY=your-32-character-encryption-key

# Configurazione MongoDB
DB_URI=mongodb://username:password@host:port/database

# Configurazione email
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
SUPPORT_EMAIL=support@yourdomain.com

# Configurazione Google Drive
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
# GOOGLE_DRIVE_CREDENTIALS deve essere il JSON completo delle credenziali OAuth2

# Configurazione sessione
SESSION_SECRET=your-session-secret-key

# URL base dell'applicazione
APP_URL=https://your-application-url.com
```

### Configurazione del database

Per configurare MongoDB:

1. Crea un database dedicato per l'applicazione
2. Crea un utente con privilegi adeguati
3. Aggiorna DB_URI nel file .env.production

L'applicazione si occuperà di creare automaticamente le collezioni necessarie al primo avvio.

## Integrazione con Google Drive

### Creazione delle credenziali OAuth

1. Accedi alla [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto
3. Abilita l'API Google Drive per il progetto
4. Crea credenziali OAuth 2.0 per applicazione Web
5. Aggiungi gli URI di reindirizzamento autorizzati
   - `https://your-application-url.com/auth/google/callback`
   - `http://localhost:5000/auth/google/callback` (per test locali)
6. Scarica il file JSON delle credenziali

### Configurazione dell'integrazione

1. Ottieni l'ID della cartella Google Drive che desideri sincronizzare

   - Puoi trovarlo nell'URL quando apri la cartella: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`

2. Configura le variabili d'ambiente nel file .env.production:
   ```
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id
   GOOGLE_DRIVE_CREDENTIALS={"web":{"client_id":"...","project_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_secret":"..."}}
   ```

## Configurazione del server email

L'applicazione utilizza Nodemailer per inviare email. Configura le seguenti variabili:

```
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
SUPPORT_EMAIL=support@yourdomain.com
```

### Test del server email

Per verificare che la configurazione email funzioni correttamente:

1. Accedi all'applicazione come amministratore
2. Vai a Impostazioni > Test Email
3. Invia un'email di test

## Backup e ripristino

### Backup automatici

L'applicazione esegue backup automatici del database ogni giorno. I backup vengono conservati per 30 giorni.

Per configurare la frequenza dei backup:

1. Modifica il file `server/config.ts`
2. Aggiorna il valore di `backupFrequencyHours`

### Backup manuali

Per eseguire un backup manuale:

1. Accedi come amministratore
2. Vai a Impostazioni > Backup e Ripristino
3. Fai clic su "Esegui backup"
4. Scarica il file di backup

### Ripristino

Per ripristinare un backup:

1. Accedi come amministratore
2. Vai a Impostazioni > Backup e Ripristino
3. Carica il file di backup
4. Conferma l'operazione di ripristino

## Risoluzione dei problemi

### Log di sistema

I log dell'applicazione sono disponibili in:

- In ambiente di produzione: `/var/log/iso-document-manager/`
- In Docker: accessibili tramite `docker logs iso-document-manager`

### Problemi comuni

#### Errore di connessione al database

- Verifica le credenziali di MongoDB
- Controlla che il servizio MongoDB sia in esecuzione
- Verifica che le regole del firewall permettano la connessione

#### Errore nell'integrazione con Google Drive

- Verifica che le credenziali OAuth siano valide
- Controlla che l'API Google Drive sia abilitata
- Verifica che l'ID della cartella sia corretto

#### Errore nell'invio delle email

- Controlla le impostazioni SMTP
- Verifica che il provider email permetta l'accesso da applicazioni
- Se usi Gmail, potrebbe essere necessario creare una password per app

### Contatti

Per ulteriore assistenza, contatta il team di supporto all'indirizzo support@isodocmanager.it
