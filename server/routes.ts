import { Express, Request, Response } from "express";
import { mongoStorage as storage } from "./mongo-storage";
import { setupAuth, sessionTimeoutMiddleware, hashPassword } from "./auth";
import { syncWithGoogleDrive, startAutomaticSync } from "./google-drive";
import { isAdmin } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  app.post("/api/sync/force", isAdmin, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const user = await storage.getUser(userId);
      const clientId = user?.clientId;
      if (!clientId) {
        return res
          .status(400)
          .json({ message: "❌ Client ID mancante per l'utente" });
      }

      const client = await storage.getClient(clientId);
      if (!client || !client.driveFolderId) {
        return res
          .status(400)
          .json({ message: "❌ Cartella Drive non trovata per il client" });
      }

      console.log("🔄 Forzando sincronizzazione manuale...");
      await syncWithGoogleDrive(client.driveFolderId, userId);

      res.json({ message: "Sincronizzazione avviata" });
    } catch (error) {
      console.error("Errore durante la sincronizzazione forzata:", error);
      res.status(500).json({ message: "Errore durante la sincronizzazione" });
    }
  });

  // ... rest of the routes ...
}
