import * as dotenv from "dotenv";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Carica le variabili d'ambiente
dotenv.config({ path: ".env.production" });

// Funzione per eseguire comandi
const runCommand = (command: string) => {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ Errore nell'esecuzione del comando: ${command}`);
    process.exit(1);
  }
};

// Funzione per creare directory se non esiste
const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Setup produzione
console.log("🚀 Configurazione ambiente di produzione...");

// 1. Verifica e crea directory necessarie
console.log("📁 Creazione directory...");
ensureDirectoryExists("dist");
ensureDirectoryExists("logs");
ensureDirectoryExists("backups");

// 2. Installa dipendenze di produzione
console.log("📦 Installazione dipendenze...");
runCommand("npm ci --production");

// 3. Build dell'applicazione
console.log("🔨 Build dell'applicazione...");
runCommand("npm run build");

// 4. Verifica configurazione
console.log("✅ Verifica configurazione...");
runCommand("npm run verify:env");

// 5. Setup PM2 per gestione processi
console.log("🔄 Setup PM2...");
runCommand("npm install -g pm2");
runCommand(
  'pm2 start dist/server/index.js --name "iso-doc-manager" --max-memory-restart 1G'
);

console.log("✨ Setup completato con successo!");
