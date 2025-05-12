import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

const requiredEnvVars = [
  "DB_URI",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "DEFAULT_ADMIN_EMAIL",
  "DEFAULT_ADMIN_PASSWORD",
];

console.log("🔍 Verifica variabili di ambiente:\n");

let allGood = true;

for (const key of requiredEnvVars) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    console.error(`❌ ${key} MANCANTE o VUOTA`);
    allGood = false;
  } else {
    console.log(
      `✅ ${key} = ${key === "DB_URI" ? value.substring(0, 40) + "..." : value}`
    );
  }
}

if (allGood) {
  console.log("\n🎉 Tutte le variabili richieste sono presenti.");
  process.exit(0);
} else {
  console.error(
    "\n💥 Alcune variabili mancanti o vuote. Correggi il file .env."
  );
  process.exit(1);
}
