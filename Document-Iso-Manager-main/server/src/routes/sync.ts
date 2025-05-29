import { Router } from "express";
import { googleDriveService } from "../services/google-drive";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      console.log("❌ [SYNC] User ID mancante");
      return res.status(400).json({ error: "User ID is required" });
    }

    console.log("🔄 [SYNC] Inizio sincronizzazione manuale per user:", userId);

    // Get user's Google Drive tokens
    const user = await prisma.user.findUnique({
      where: { legacyId: userId },
      include: {
        googleDriveTokens: true,
        client: true, // Includiamo anche i dati del client
      },
    });

    console.log("👤 [SYNC] Dati utente:", {
      id: user?.legacyId,
      email: user?.email,
      role: user?.role,
      hasTokens: !!user?.googleDriveTokens,
      clientId: user?.client?.legacyId,
      clientName: user?.client?.name,
      driveFolderId: user?.client?.driveFolderId,
    });

    if (!user) {
      console.log("❌ [SYNC] Utente non trovato:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.googleDriveTokens) {
      console.log(
        "❌ [SYNC] Token Google Drive non trovati per l'utente:",
        userId
      );
      return res.status(400).json({ error: "Google Drive not configured" });
    }

    if (!user.client?.driveFolderId) {
      console.log(
        "❌ [SYNC] Cartella Drive non configurata per il client:",
        user.client?.name
      );
      return res
        .status(400)
        .json({ error: "Drive folder not configured for client" });
    }

    // Start sync process
    console.log("🔄 [SYNC] Avvio processo di sincronizzazione...");
    const syncResult = await googleDriveService.syncDocuments(userId);

    console.log("✅ [SYNC] Sincronizzazione completata:", syncResult);

    res.json({
      message: "Sync started successfully",
      result: syncResult,
    });
  } catch (error) {
    console.error("❌ [SYNC] Errore durante la sincronizzazione:", error);
    res.status(500).json({ error: "Failed to sync documents" });
  }
});

export default router;
