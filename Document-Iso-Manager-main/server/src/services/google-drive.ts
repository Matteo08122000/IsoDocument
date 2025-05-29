import { google, drive_v3 } from "googleapis";
import fs from "fs";
import { pipeline } from "stream/promises";
import { getDriveClientForClient } from "../../google-oauth";

export async function syncDocuments(userId: number): Promise<any> {
  console.log("🔄 [DRIVE] Inizio sincronizzazione documenti per user:", userId);

  try {
    const user = await prisma.user.findUnique({
      where: { legacyId: userId },
      include: {
        client: true,
        googleDriveTokens: true,
      },
    });

    console.log("👤 [DRIVE] Dati utente:", {
      id: user?.legacyId,
      email: user?.email,
      role: user?.role,
      clientId: user?.client?.legacyId,
      clientName: user?.client?.name,
      hasTokens: !!user?.googleDriveTokens,
    });

    if (!user?.client?.driveFolderId) {
      console.log("❌ [DRIVE] Cartella Drive non configurata");
      throw new Error("Drive folder not configured");
    }

    if (!user?.googleDriveTokens) {
      console.log("❌ [DRIVE] Token Google Drive non trovati");
      throw new Error("Google Drive tokens not found");
    }

    const drive = await getDriveClientForClient(user.client.legacyId);
    console.log("🔌 [DRIVE] Client Drive ottenuto:", !!drive);

    const files = await googleDriveListFiles(drive, user.client.driveFolderId);
    console.log("📄 [DRIVE] File trovati:", files.length);
    console.log(
      "📄 [DRIVE] Dettaglio file:",
      files.map((f) => ({
        name: f.name,
        id: f.id,
        mimeType: f.mimeType,
      }))
    );

    // ... resto del codice esistente ...
  } catch (error) {
    console.error("❌ [DRIVE] Errore sincronizzazione:", error);
    throw error;
  }
}
