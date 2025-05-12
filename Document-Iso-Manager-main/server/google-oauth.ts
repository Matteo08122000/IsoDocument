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
    res.send(
      "✅ Accesso Google Drive completato! Ora puoi chiudere questa finestra."
    );
  } catch (err) {
    console.error("❌ Errore callback Google:", err);
    res.status(500).send("Errore durante l'accesso a Google");
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
  const client = await mongoStorage.getClient(clientId);
  if (
    !client?.google ||
    !client.google.accessToken ||
    !client.google.refreshToken
  ) {
    throw new Error("Token Google mancante");
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.SERVER_BASE_URL}/api/google/callback`
  );

  auth.setCredentials({
    access_token: client.google.accessToken,
    refresh_token: client.google.refreshToken,
    expiry_date: client.google.expiryDate,
  });

  return google.drive({ version: "v3", auth });
}
