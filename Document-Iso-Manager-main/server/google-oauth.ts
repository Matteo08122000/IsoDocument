import { google } from "googleapis";
import { Request, Response } from "express";
import { mongoStorage } from "./mongo-storage";
import dotenv from "dotenv";

dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  `${process.env.SERVER_BASE_URL}/api/google/callback`
);

// Step 1 – Avvia login Google
export async function googleAuth(req: Request, res: Response) {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).send("Client ID mancante");

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
    prompt: "consent", // necessario per ottenere refreshToken ogni volta
    state: String(clientId),
  });

  res.redirect(authUrl);
}

// Step 2 – Callback dopo login Google
export async function googleAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send("❌ Dati mancanti nella query");
  }

  const clientId = parseInt(state as string);
  if (isNaN(clientId)) {
    return res.status(400).send("❌ clientId non valido");
  }

  try {
    const redirectUri = `${process.env.SERVER_BASE_URL}/api/google/callback`;

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri
    );

    const { tokens } = await oAuth2Client.getToken(String(code));

    if (!tokens.access_token || !tokens.refresh_token) {
      return res.status(400).send("❌ Token non ricevuti correttamente");
    }

    await mongoStorage.updateClientTokens(clientId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || undefined,
    });

    console.log("✅ Token salvati per client", clientId);

    // Invia una pagina HTML che comunica con la finestra principale
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connessione Completata</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f9fafb;
              color: #1f2937;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .message {
              font-size: 18px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <div class="message">
            Connessione completata!<br>
            Questa finestra si chiuderà automaticamente...
          </div>
          <script>
            window.opener.postMessage({ type: 'GOOGLE_DRIVE_CONNECTED' }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ Errore callback Google:", err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Errore</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fef2f2;
              color: #991b1b;
            }
          </style>
        </head>
        <body>
          <div>
            Errore durante l'accesso a Google.<br>
            Chiudi questa finestra e riprova.
          </div>
        </body>
      </html>
    `);
  }
}

export function getGoogleAuthUrl(clientId: number): string {
  const baseUrl = process.env.SERVER_BASE_URL;
  if (!baseUrl) throw new Error("❌ SERVER_BASE_URL mancante nel .env");

  const redirectUri = `${baseUrl}/api/google/callback`;

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri
  );

  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
    state: String(clientId),
  });

  // 👇 LOG QUI
  console.log("🔗 URL generato:", url);
  console.log("📍 redirectUri:", redirectUri);
  console.log("🧬 GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
  console.log("🧬 SERVER_BASE_URL:", process.env.SERVER_BASE_URL);

  return url;
}

export async function getDriveClientForClient(clientId: number) {
  console.log("🔑 [AUTH] Richiesta Drive client per clientId:", clientId);

  const client = await mongoStorage.getClient(clientId);

  // Log completo della struttura letta dal DB
  console.log(
    "👤 [AUTH] Client raw object da mongoStorage.getClient:",
    JSON.stringify(client, null, 2)
  );
  if (client && typeof client.google === "object") {
    console.log("[DEBUG] Tipo campo google:", typeof client.google);
    console.log("[DEBUG] Campo google:", client.google);
  } else {
    console.log("[DEBUG] Campo google mancante o non oggetto!", client?.google);
  }

  // Log specifici dei token (per capire se sono stringhe vuote, undefined, null ecc)
  const accessToken = client?.google?.accessToken;
  const refreshToken = client?.google?.refreshToken;
  const expiryDate = client?.google?.expiryDate;
  console.log(
    "🔍 [DEBUG] accessToken:",
    accessToken,
    "| typeof:",
    typeof accessToken
  );
  console.log(
    "🔍 [DEBUG] refreshToken:",
    refreshToken,
    "| typeof:",
    typeof refreshToken
  );
  console.log(
    "🔍 [DEBUG] expiryDate:",
    expiryDate,
    "| typeof:",
    typeof expiryDate
  );

  // Token check esteso
  const missingTokens = [];
  if (!accessToken) missingTokens.push("accessToken");
  if (!refreshToken) missingTokens.push("refreshToken");

  if (missingTokens.length > 0) {
    console.error("❌ [AUTH] Token Google mancanti per il client:", {
      clientId,
      missing: missingTokens,
      clientRaw: client,
      googleField: client?.google,
    });
    throw new Error("Token Google mancante: " + missingTokens.join(", "));
  }

  // Configurazione OAuth2
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.SERVER_BASE_URL}/api/google/callback`
  );

  console.log("🔌 [AUTH] Configurazione OAuth2 completata");

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryDate,
  });

  console.log("✅ [AUTH] Credenziali impostate correttamente");

  return google.drive({ version: "v3", auth });
}
