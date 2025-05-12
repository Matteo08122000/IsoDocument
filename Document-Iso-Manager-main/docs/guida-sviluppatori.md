# ISO Document Manager - Guida per Sviluppatori

## Indice

1. [Panoramica dell'architettura](#panoramica-dellarchitettura)
2. [Struttura del progetto](#struttura-del-progetto)
3. [Stack tecnologico](#stack-tecnologico)
4. [Ambiente di sviluppo](#ambiente-di-sviluppo)
5. [API documentazione](#api-documentazione)
6. [Test](#test)
7. [Linee guida per il contributo](#linee-guida-per-il-contributo)

## Panoramica dell'architettura

ISO Document Manager è un'applicazione fullstack che utilizza un'architettura client-server:

- **Frontend**: Single Page Application (SPA) basata su React con TypeScript
- **Backend**: API RESTful basata su Express.js con TypeScript
- **Database**: MongoDB per la persistenza dei dati
- **Integrazione esterna**: API Google Drive per la sincronizzazione dei documenti

L'architettura è organizzata secondo i seguenti principi:

- **Separation of Concerns**: Frontend e backend separati con interfacce ben definite
- **Modular Design**: Componenti e moduli indipendenti e riutilizzabili
- **Type Safety**: TypeScript utilizzato sia nel frontend che nel backend
- **RESTful API**: Comunicazione client-server tramite API RESTful

## Struttura del progetto

```
├── client                 # Codice frontend React
│   ├── src
│   │   ├── components     # Componenti React riutilizzabili
│   │   ├── hooks          # Custom React hooks
│   │   ├── lib            # Utility e funzioni di supporto
│   │   ├── pages          # Componenti pagina
│   │   └── App.tsx        # Componente principale dell'applicazione
│   ├── index.html         # Template HTML di base
│   └── vite.config.ts     # Configurazione Vite
│
├── server                 # Codice backend Express
│   ├── models             # Definizioni modelli MongoDB
│   ├── routes             # Endpoint API
│   ├── services           # Logica di business
│   ├── middleware         # Middleware Express
│   ├── utils              # Utility e funzioni di supporto
│   └── index.ts           # Entry point dell'applicazione backend
│
├── shared                 # Codice condiviso tra frontend e backend
│   └── types              # Definizioni di tipi TypeScript
│
├── docs                   # Documentazione
├── tests                  # Test automatizzati
└── scripts                # Script di utilità
```

## Stack tecnologico

### Frontend

- **React**: Libreria UI
- **TypeScript**: Linguaggio di programmazione
- **Vite**: Build tool e dev server
- **TanStack Query**: Gestione delle chiamate API e dello stato
- **Wouter**: Gestione del routing
- **Tailwind CSS**: Framework CSS utility-first
- **shadcn/ui**: Componenti UI basati su Radix UI
- **Zod**: Validazione dello schema

### Backend

- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **TypeScript**: Linguaggio di programmazione
- **MongoDB**: Database NoSQL
- **Mongoose**: ODM per MongoDB
- **Passport.js**: Autenticazione
- **Nodemailer**: Invio email
- **googleapis**: Integrazione con Google Drive
- **multer**: Gestione upload file

## Ambiente di sviluppo

### Requisiti

- Node.js (v16+)
- MongoDB
- Account Google Cloud Platform (per l'integrazione con Google Drive)

### Setup locale

1. Clona il repository:
   ```bash
   git clone https://github.com/your-repo/iso-document-manager.git
   cd iso-document-manager
   ```

2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Configura le variabili d'ambiente:
   ```bash
   cp .env.example .env
   ```
   Modifica il file `.env` con i valori appropriati.

4. Avvia l'applicazione in modalità sviluppo:
   ```bash
   npm run dev
   ```

### Script disponibili

- `npm run dev`: Avvia il server di sviluppo
- `npm run build`: Compila l'applicazione per la produzione
- `npm run start`: Avvia l'applicazione compilata
- `npm run lint`: Esegue il linting del codice
- `npm run format`: Formatta il codice con Prettier
- `npm run test`: Esegue i test

## API documentazione

L'API è organizzata secondo i principi RESTful. Tutti gli endpoint sono prefissati con `/api`.

### Autenticazione

- `POST /api/login`: Autentica un utente
- `POST /api/logout`: Termina la sessione utente
- `GET /api/user`: Ottiene l'utente corrente
- `POST /api/forgot-password`: Richiedi reset password
- `POST /api/reset-password`: Reimposta password

### Documenti

- `GET /api/documents`: Ottiene tutti i documenti
- `GET /api/documents/:id`: Ottiene un documento specifico
- `POST /api/documents`: Crea un nuovo documento
- `PUT /api/documents/:id`: Aggiorna un documento
- `DELETE /api/documents/:id`: Elimina un documento
- `GET /api/documents/:id/download`: Scarica un documento

### Utenti

- `GET /api/users`: Ottiene tutti gli utenti (admin)
- `GET /api/users/:id`: Ottiene un utente specifico (admin)
- `POST /api/users`: Crea un nuovo utente (admin)
- `PUT /api/users/:id`: Aggiorna un utente (admin)
- `DELETE /api/users/:id`: Disattiva un utente (admin)

### Sincronizzazione

- `POST /api/sync`: Avvia una sincronizzazione manuale (admin)
- `GET /api/sync/status`: Ottiene lo stato della sincronizzazione

## Test

Il progetto utilizza Jest per i test unitari e Cypress per i test end-to-end.

### Test unitari

I test unitari sono organizzati in modo da rispecchiare la struttura del progetto:

```
├── tests
│   ├── unit
│   │   ├── client         # Test per il frontend
│   │   ├── server         # Test per il backend
│   │   └── shared         # Test per il codice condiviso
```

Per eseguire i test unitari:

```bash
npm run test:unit
```

### Test end-to-end

I test end-to-end utilizzano Cypress per simulare l'interazione dell'utente con l'applicazione:

```
├── tests
│   ├── e2e
│   │   ├── specs         # Specifiche dei test
│   │   ├── fixtures      # Dati di test
│   │   └── support       # Utility e configurazione
```

Per eseguire i test end-to-end:

```bash
npm run test:e2e
```

## Linee guida per il contributo

### Workflow di sviluppo

1. Crea un fork del repository
2. Crea un branch per la tua feature o bugfix (`git checkout -b feature/nome-feature`)
3. Implementa le modifiche
4. Esegui i test e assicurati che passino
5. Commit delle modifiche seguendo le convenzioni di commit
6. Push del branch al tuo fork
7. Invia una pull request

### Convenzioni di commit

Utilizziamo [Conventional Commits](https://www.conventionalcommits.org/) per i messaggi di commit:

- `feat:` per nuove funzionalità
- `fix:` per correzioni di bug
- `docs:` per modifiche alla documentazione
- `style:` per modifiche di formattazione (no cambiamenti di codice)
- `refactor:` per refactoring del codice
- `test:` per aggiungere o correggere test
- `chore:` per modifiche a strumenti di build, configurazioni, ecc.

### Standard di codice

- Utilizza TypeScript per tutto il codice
- Segui le linee guida di stile configurate in ESLint e Prettier
- Mantieni un'alta copertura di test per tutto il codice
- Documenta le nuove funzionalità e le API

### Revisione del codice

Ogni pull request verrà revisionata da almeno un membro del team. I requisiti per l'approvazione includono:

- Tutti i test passano
- Il codice segue gli standard di progetto
- La documentazione è stata aggiornata (se necessario)
- Non ci sono regressioni nelle funzionalità esistenti
