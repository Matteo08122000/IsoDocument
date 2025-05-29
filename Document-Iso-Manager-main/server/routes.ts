import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { mongoStorage as storage } from "./mongo-storage";
import { setupAuth, sessionTimeoutMiddleware, hashPassword } from "./auth";
import { syncWithGoogleDrive, startAutomaticSync } from "./google-drive";
import {
  startExpirationChecks,
  setCustomWarningDays,
} from "./notification-service";
import { handleContactRequest, handlePasswordReset } from "./mailer";
import { generateSecureLink, verifySecureLink } from "./secure-links";

import {
  googleDriveDownloadFile,
  googleDriveListFiles,
} from "./google-drive-api";
import { getDriveClientForClient } from "./google-oauth";

import {
  CompanyCodeDocument as CompanyCode,
  InsertCompanyCode,
} from "../shared-types/companycode";

// Zod schema di validazione (supponiamo siano tutti lì)
import { documentSchema } from "../server/models/mongoose-models";

import { z } from "zod";
import { extractFolderIdFromUrl } from "./google-drive";
import { startAutomaticSyncForAllClients } from "./google-drive";
import { googleAuthCallback, getGoogleAuthUrl } from "./google-oauth";
import { transporter } from "./mailer";
import { ClientDocument } from "./models/mongoose-models";
import { insertClientSchema } from "../shared-types/validators";

// Middleware to check if user is authenticated with improved session timeout check
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Prima applicare il middleware di session timeout migliorato
  // Questo gestirà anche i casi in cui la sessione è scaduta
  sessionTimeoutMiddleware(req, res, () => {
    // Se siamo qui, la sessione è valida o è stata rigenerata
    // Ora verifichiamo se l'utente è autenticato
    if (!req.isAuthenticated()) {
      console.log(
        "Utente non autenticato ma sessione valida - verificare lo stato dell'autenticazione"
      );
      return res.status(401).json({ message: "Non autenticato" });
    }

    // Utente autenticato e sessione valida
    next();
  });
};

// Middleware to check if user is an admin with improved session timeout check
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Prima applicare il middleware di session timeout migliorato
  // Questo gestirà anche i casi in cui la sessione è scaduta
  sessionTimeoutMiddleware(req, res, () => {
    // Verifica se l'utente è autenticato
    if (!req.isAuthenticated()) {
      console.log("Utente admin non autenticato ma sessione valida");
      return res.status(401).json({ message: "Non autenticato" });
    }

    // Verifica se l'utente è un admin
    if (!req.user || req.user.role !== "admin") {
      console.log(`Utente autenticato ma non admin: ${req.user?.role}`);
      return res.status(403).json({ message: "Accesso negato" });
    }

    // Utente autenticato come admin e sessione valida
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  app.get("/api/debug/sync-status", isAdmin, async (req, res) => {
    try {
      const userId = req.user?.legacyId;
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

      const folderId = client.driveFolderId;

      const drive = await getDriveClientForClient(clientId);
      const files = await googleDriveListFiles(drive, folderId);

      const results = [];

      for (const file of files) {
        const tmpPath = path.join(os.tmpdir(), `${uuidv4()}-${file.name}`);
        try {
          await googleDriveDownloadFile(drive, file.legacyId!, tmpPath);
          const doc = await processDocumentFile(file.name!, file.webViewLink!);
          fs.unlinkSync(tmpPath);

          if (!doc) {
            results.push({
              file: file.name,
              status: "skipped",
              reason: "Parsing fallito",
            });
            continue;
          }

          const existing = await storage.getDocumentByPathAndTitleAndRevision(
            doc.path,
            doc.title,
            doc.revision
          );

          if (existing) {
            results.push({
              file: file.name,
              status: "skipped",
              reason: "Esiste già",
            });
            continue;
          }

          const created = await storage.createDocument({
            ...doc,
            clientId,
            ownerId: userId,
          });

          results.push({
            file: file.name,
            status: "created",
            id: created.legacyId,
          });
        } catch (err) {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
          results.push({
            file: file.name,
            status: "error",
            error: String(err),
          });
        }
      }

      return res.json({
        message: "Diagnostica completata",
        userId,
        clientId,
        folderId,
        fileCount: files.length,
        results,
      });
    } catch (error) {
      console.error("Errore diagnostica sync-status:", error);
      return res.status(500).json({
        message: "Errore durante la diagnostica",
        error: String(error),
      });
    }
  });

  // Documents API
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.json([]); // Utente senza clientId non vede nulla
      }

      const documents = await storage.getDocumentsByClientId(clientId);
      res.json(documents);
    } catch (error) {
      console.error("❌ [API] Errore nel recupero documenti:", error);
      res.status(500).json({ message: "Impossibile recuperare i documenti" });
    }
  });

  app.get("/api/documents/obsolete", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) return res.json([]);
      const documents = await storage.getObsoleteDocumentsByClientId(clientId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch obsolete documents" });
    }
  });

  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10); // <-- param corretto!
      const document = await storage.getDocument(id);

      if (!document || document.clientId !== req.user?.clientId) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", isAdmin, async (req, res) => {
    try {
      // Verifica che l'utente abbia un clientId
      if (!req.user?.clientId) {
        return res.status(403).json({
          message: "Accesso negato: l'utente non è associato a nessun client",
        });
      }

      const validatedData = documentSchema.parse({
        ...req.body,
        clientId: req.user.clientId, // Forza il clientId dell'utente
      });

      const document = await storage.createDocument(validatedData);

      // Log dell'azione
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "upload",
          documentId: document.legacyId,
          details: { message: `Document created: ${document.title}` },
        });
      }

      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Error creating document" });
    }
  });

  app.put("/api/documents/:legacyId", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      // Verifica che il documento esista e appartenga al client dell'admin
      const existingDoc = await storage.getDocument(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (existingDoc.clientId !== req.user?.clientId) {
        return res.status(403).json({
          message:
            "Accesso negato: non puoi modificare documenti di altri client",
        });
      }

      const validatedData = documentSchema.partial().parse({
        ...req.body,
        clientId: req.user.clientId, // Mantieni il clientId originale
      });

      const document = await storage.updateDocument(id, validatedData);

      // Log dell'azione
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "update",
          documentId: document.legacyId,
          details: { message: `Document updated: ${document.title}` },
        });
      }

      res.json(document);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Error updating document" });
    }
  });

  app.delete("/api/documents/:legacyId", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      // Verifica che il documento esista e appartenga al client dell'admin
      const existingDoc = await storage.getDocument(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (existingDoc.clientId !== req.user?.clientId) {
        return res.status(403).json({
          message:
            "Accesso negato: non puoi eliminare documenti di altri client",
        });
      }

      await storage.markDocumentObsolete(id);

      // Log dell'azione
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "delete",
          documentId: id,
          details: {
            message: `Document marked as obsolete: ${existingDoc.title}`,
          },
        });
      }

      res.json({ message: "Document marked as obsolete" });
    } catch (error) {
      console.error("Error marking document as obsolete:", error);
      res.status(500).json({ message: "Error marking document as obsolete" });
    }
  });

  // Users API (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.json([]); // Admin senza clientId non vede nulla
      }

      const users = await storage.getUsersByClientId(clientId);
      // Remove passwords from the response
      const safeUsers = users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Endpoint per creare un nuovo utente (solo admin)
  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const { email, password, role } = req.body;

      // Validazione dei dati
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email e password sono obbligatorie" });
      }

      // Verifica se l'utente esiste già
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Utente con questa email già registrato" });
      }

      // Se stiamo creando un admin, il clientId DEVE essere null
      if (role === "admin") {
        const hashedPassword = await hashPassword(password);
        const newUser = await storage.createUser({
          email,
          password: hashedPassword,
          role: "admin",
          clientId: null, // Forziamo null per i nuovi admin
          lastLogin: null,
          sessionExpiry: null,
        });

        // Log della creazione admin
        if (req.user && req.user.legacyId) {
          await storage.createLog({
            userId: req.user.legacyId,
            action: "user-creation",
            details: {
              message: `Nuovo admin creato: ${email}`,
              timestamp: new Date().toISOString(),
              createdUserId: newUser.legacyId,
            },
          });
        }

        const { password: _, ...safeUser } = newUser;
        return res.status(201).json(safeUser);
      }

      // Per i viewer, usiamo il clientId dell'admin che li crea
      const adminClientId = req.user?.clientId;
      if (!adminClientId) {
        return res
          .status(400)
          .json({ message: "Admin non associato a nessun client" });
      }

      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        role: "viewer",
        clientId: adminClientId,
        lastLogin: null,
        sessionExpiry: null,
      });

      // Log della creazione viewer
      if (req.user && req.user.legacyId) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "user-creation",
          details: {
            message: `Nuovo viewer creato: ${email} per il client ${adminClientId}`,
            timestamp: new Date().toISOString(),
            createdUserId: newUser.legacyId,
            clientId: adminClientId,
          },
        });
      }

      const { password: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("User creation error:", error);
      res
        .status(500)
        .json({ message: "Errore durante la creazione dell'utente" });
    }
  });

  app.patch("/api/users/:legacyId/role", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.legacyId, 10);
      const { role } = req.body;

      if (!["admin", "viewer"].includes(role)) {
        return res.status(400).json({ message: "Ruolo non valido" });
      }

      // Aggiorna il ruolo usando la funzione storage (che usa legacyId come chiave)
      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log dell'operazione (opzionale)
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "user-role-change",
          details: {
            message: `Ruolo utente ${userId} cambiato in ${role}`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Rimuovi password dalla risposta
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user role:", error);
      res
        .status(500)
        .json({ message: "Impossibile aggiornare il ruolo utente" });
    }
  });

  // Admin: genera URL per collegare Google Drive
  app.get("/api/google/auth-url/:clientId", isAdmin, (req, res) => {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: "clientId non valido" });
    }
    const url = getGoogleAuthUrl(clientId); // ✅ CORRETTO
    res.json({ url });
  });

  // Callback dopo autorizzazione
  app.get("/api/google/callback", googleAuthCallback);

  // Endpoint per cambiare la password dell'utente corrente
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Inserisci sia la password attuale che la nuova password",
        });
      }

      // Verifica che l'utente sia autenticato e che req.user esista
      if (!req.user || !req.user.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      // Ottieni l'utente dal database
      const user = await storage.getUser(req.user.legacyId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      // Verifica che la password attuale sia corretta
      const { comparePasswords } = await import("./auth");
      const isPasswordValid = await comparePasswords(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "La password attuale non è corretta" });
      }

      // Hash della nuova password
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(newPassword);

      // Aggiorna la password nel database
      console.log(`Aggiornamento password per utente ${user.legacyId}`);
      const updatedUser = await storage.updateUserPassword(
        user.legacyId,
        hashedPassword
      );

      if (!updatedUser) {
        return res
          .status(500)
          .json({ message: "Impossibile aggiornare la password" });
      }

      // Log dell'operazione
      await storage.createLog({
        userId: user.legacyId,
        action: "password-change",
        details: {
          message: "Password modificata con successo",
          timestamp: new Date().toISOString(),
        },
      });

      // Non facciamo più il logout automatico, sarà il client a decidere
      // quando disconnettere l'utente, dando il tempo di visualizzare i messaggi
      res.json({ message: "Password aggiornata con successo" });
    } catch (error) {
      console.error("Password change error:", error);
      res
        .status(500)
        .json({ message: "Errore durante il cambio della password" });
    }
  });

  // Audit logs API (admin only)
  app.get("/api/logs", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.json([]); // Admin senza clientId non vede nulla
      }

      const logs = await storage.getLogsByClientId(clientId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Google Drive sync API (admin only)
  app.post("/api/sync", isAdmin, async (req, res) => {
    try {
      const { syncFolder } = req.body;

      if (!syncFolder) {
        return res.status(400).json({ message: "Sync folder is required" });
      }

      // Estrai l'ID della cartella dall'URL o dall'ID fornito
      const folderId = extractFolderIdFromUrl(syncFolder);

      // Se l'ID non è valido, restituisci un errore
      if (!folderId) {
        return res.status(400).json({
          message: "L'URL o l'ID della cartella Google Drive non è valido",
        });
      }

      // Start sync process (non-blocking) con l'ID estratto
      if (req.user) {
        syncWithGoogleDrive(folderId, req.user.legacyId).catch((error) =>
          console.error("Sync error:", error)
        );
      }

      res.json({ message: "Sync process started" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start sync process" });
    }
  });

  // Client API (admin only)
  app.get("/api/clients", isAdmin, async (req, res) => {
    try {
      if (!req.user?.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const clients = await storage.getClientsByAdminId(req.user.legacyId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Impossibile recuperare i client" });
    }
  });

  app.get("/api/clients/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      // Verifica che l'admin abbia accesso a questo cliente
      if (!req.user?.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const admin = await storage.getUser(req.user.legacyId);
      if (!admin) {
        return res.status(401).json({ message: "Admin non trovato" });
      }

      // Se l'admin non ha clientId o ha un clientId diverso, accesso negato
      if (!admin.clientId || admin.clientId !== id) {
        return res
          .status(403)
          .json({ message: "Accesso negato a questo cliente" });
      }

      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client non trovato" });
      }

      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Impossibile recuperare il client" });
    }
  });

  app.post("/api/clients", isAdmin, async (req, res) => {
    try {
      console.log("📥 [API] Richiesta creazione client ricevuta:", req.body);

      // Verifica che l'admin non abbia già un clientId
      if (req.user?.clientId) {
        return res.status(400).json({
          message: "Questo admin è già associato a un cliente",
        });
      }

      // Valida i dati in input
      const inputData = req.body;
      console.log("Dati input validati:", inputData);

      // Estrai l'ID della cartella dall'URL o dall'ID fornito
      const driveFolderId = extractFolderIdFromUrl(inputData.driveFolderId);
      console.log("DriveFolderId estratto:", driveFolderId);

      // Se l'ID non è valido, restituisci un errore
      if (!driveFolderId) {
        console.error("❌ DriveFolderId non valido:", inputData.driveFolderId);
        return res.status(400).json({
          message: "L'URL o l'ID della cartella Google Drive non è valido",
          errors: [{ path: ["driveFolderId"], message: "URL o ID non valido" }],
        });
      }

      // Procedi con i dati validati sostituendo l'URL con l'ID estratto
      const validatedData = insertClientSchema.parse({
        ...inputData,
        driveFolderId: driveFolderId,
      });
      console.log("✅ Dati validati:", validatedData);

      const client = await storage.createClient(validatedData);
      console.log("✅ Client creato con successo:", client);

      // Associa l'admin al nuovo cliente
      if (req.user?.legacyId) {
        await storage.updateUserClient(req.user.legacyId, client.legacyId);
        console.log(
          "✅ Admin associato al client:",
          req.user.legacyId,
          client.legacyId
        );
      }

      // Log dell'azione
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "client-creation",
          details: {
            message: `Client creato: ${client.name}`,
            folderId: driveFolderId,
            timestamp: new Date().toISOString(),
            clientId: client.legacyId,
          },
        });
      }

      res.status(201).json(client);
    } catch (error) {
      console.error("❌ Errore nella creazione del client:", error);
      if (error instanceof z.ZodError) {
        console.error("Errore di validazione:", error.errors);
        return res.status(400).json({
          message: "Dati client non validi",
          errors: error.errors,
        });
      }
      res.status(500).json({
        message: "Impossibile creare il client",
        error: error instanceof Error ? error.message : "Errore sconosciuto",
      });
    }
  });

  app.put("/api/clients/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      // Verifica che l'admin abbia accesso a questo cliente
      if (!req.user?.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const admin = await storage.getUser(req.user.legacyId);
      if (!admin) {
        return res.status(401).json({ message: "Admin non trovato" });
      }

      // Se l'admin non ha clientId o ha un clientId diverso, accesso negato
      if (!admin.clientId || admin.clientId !== id) {
        return res
          .status(403)
          .json({ message: "Accesso negato a questo cliente" });
      }

      const inputData = req.body;

      // Se c'è un driveFolderId, estrai l'ID dall'URL o dall'ID fornito
      if (inputData.driveFolderId) {
        const driveFolderId = extractFolderIdFromUrl(inputData.driveFolderId);

        // Se l'ID non è valido, restituisci un errore
        if (!driveFolderId) {
          return res.status(400).json({
            message: "L'URL o l'ID della cartella Google Drive non è valido",
            errors: [
              { path: ["driveFolderId"], message: "URL o ID non valido" },
            ],
          });
        }

        // Sostituisci l'URL con l'ID estratto
        inputData.driveFolderId = driveFolderId;
      }

      // Valida i dati in input
      const validatedData = InsertClient.partial().parse(inputData);

      const client = await storage.updateClient(id, validatedData);

      if (!client) {
        return res.status(404).json({ message: "Client non trovato" });
      }

      // Log the action
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "client-update",
          details: {
            message: `Client aggiornato: ${client.name}`,
            folderId: inputData.driveFolderId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Dati client non validi", errors: error.errors });
      }
      res.status(500).json({ message: "Impossibile aggiornare il client" });
    }
  });

  app.patch("/api/users/:id/client", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.legacyId, 10);
      const { clientId } = req.body;

      // Verifica se l'utente esiste
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      // Se clientId è null, rimuovi l'associazione
      // Altrimenti, verifica che il client esista
      if (clientId !== null) {
        const client = await storage.getClient(clientId);
        if (!client) {
          return res.status(404).json({ message: "Client non trovato" });
        }
      }

      // Aggiorna l'utente con il nuovo clientId
      const updatedUser = await storage.updateUserClient(userId, clientId);

      // Rimuovi la password dalla risposta
      const { password, ...userWithoutPassword } = updatedUser!;

      // Log dell'operazione
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "user-client-assignment",
          details: {
            message:
              clientId === null
                ? `Rimossa associazione client per utente ${userId}`
                : `Assegnato client ${clientId} all'utente ${userId}`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error assigning client to user:", error);
      res
        .status(500)
        .json({ message: "Impossibile assegnare il client all'utente" });
    }
  });

  // Endpoint di contatto (non richiede autenticazione)
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, message, to, subject } = req.body;

      if (!name || !email || !message) {
        return res
          .status(400)
          .json({ error: "Tutti i campi sono obbligatori" });
      }

      // Invia l'email usando nodemailer
      const info = await transporter.sendMail({
        from: `"${name}" <${email}>`,
        to: to || "docgenius8@gmail.com",
        subject: subject || `Richiesta di assistenza da ${name}`,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nuova richiesta di assistenza</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Da:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Messaggio:</strong></p>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Questo messaggio è stato inviato dal form di contatto del Sistema di Gestione Documenti ISO.
            </p>
          </div>
        `,
      });

      console.log("Email inviata:", info.messageId);
      res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("Errore nell'invio dell'email:", error);
      res.status(500).json({ error: "Errore nell'invio dell'email" });
    }
  });

  // Endpoint per richiedere il reset della password
  app.post("/api/forgot-password", handlePasswordReset);

  // API per gestire i codici aziendali
  // GET - Ottieni tutti i codici aziendali (solo admin)
  app.get("/api/company-codes", isAdmin, async (req, res) => {
    try {
      const codes = await storage.getAllCompanyCodes();
      res.json(codes);
    } catch (error) {
      console.error("Error fetching company codes:", error);
      res
        .status(500)
        .json({ message: "Errore durante il recupero dei codici aziendali" });
    }
  });

  // POST - Crea un nuovo codice aziendale (solo admin)
  app.post("/api/company-codes", isAdmin, async (req, res) => {
    try {
      const { code, role, usageLimit, expiresAt, isActive } = req.body;

      // Verifica se il codice esiste già
      const existingCode = await storage.getCompanyCodeByCode(code);
      if (existingCode) {
        return res
          .status(400)
          .json({ message: "Questo codice aziendale esiste già" });
      }

      // Crea il nuovo codice aziendale
      const newCode = await storage.createCompanyCode({
        code,
        role: role || "admin",
        usageLimit: usageLimit || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user?.legacyId || 0, // Usa 0 come fallback se req.user è undefined
      });

      // Registra la creazione nel log
      await storage.createLog({
        userId: req.user?.legacyId || 0,
        action: "company_code_created",
        details: {
          message: "Company code created",
          code: code,
          role: role || "admin",
          timestamp: new Date().toISOString(),
        },
      });

      res.status(201).json(newCode);
    } catch (error) {
      console.error("Error creating company code:", error);
      res
        .status(500)
        .json({ message: "Errore durante la creazione del codice aziendale" });
    }
  });

  // PATCH - Aggiorna un codice aziendale esistente (solo admin)
  app.patch("/api/company-codes/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId);
      const { code, role, usageLimit, expiresAt, isActive } = req.body;

      // Verifica se il codice esiste
      const existingCode = await storage.getCompanyCode(id);
      if (!existingCode) {
        return res
          .status(404)
          .json({ message: "Codice aziendale non trovato" });
      }

      // Se si sta aggiornando il codice, verifica che non ci siano duplicati
      if (code && code !== existingCode.code) {
        const duplicateCode = await storage.getCompanyCodeByCode(code);
        if (duplicateCode && duplicateCode.legacyId !== id) {
          return res
            .status(400)
            .json({ message: "Questo codice aziendale esiste già" });
        }
      }

      // Preparazione dati per l'aggiornamento
      const updateData: Partial<InsertCompanyCode> = {};
      if (code !== undefined) updateData.code = code;
      if (role !== undefined) updateData.role = role;
      if (usageLimit !== undefined) updateData.usageLimit = usageLimit;
      if (expiresAt !== undefined)
        updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Aggiorna il codice aziendale
      const updatedCode = await storage.updateCompanyCode(id, updateData);

      // Registra l'aggiornamento nel log
      await storage.createLog({
        userId: req.user?.legacyId || 0,
        action: "company_code_updated",
        details: {
          message: "Company code updated",
          codeId: id,
          updates: updateData,
          timestamp: new Date().toISOString(),
        },
      });

      res.json(updatedCode);
    } catch (error) {
      console.error("Error updating company code:", error);
      res.status(500).json({
        message: "Errore durante l'aggiornamento del codice aziendale",
      });
    }
  });

  // DELETE - Elimina un codice aziendale (solo admin)
  app.delete("/api/company-codes/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId);

      // Verifica se il codice esiste
      const existingCode = await storage.getCompanyCode(id);
      if (!existingCode) {
        return res
          .status(404)
          .json({ message: "Codice aziendale non trovato" });
      }

      // Elimina il codice aziendale
      const deleted = await storage.deleteCompanyCode(id);

      if (deleted) {
        // Registra l'eliminazione nel log
        await storage.createLog({
          userId: req.user?.legacyId || 0,
          action: "company_code_deleted",
          details: {
            message: "Company code deleted",
            codeId: id,
            code: existingCode.code,
            timestamp: new Date().toISOString(),
          },
        });

        res.json({ message: "Codice aziendale eliminato con successo" });
      } else {
        res
          .status(500)
          .json({ message: "Impossibile eliminare il codice aziendale" });
      }
    } catch (error) {
      console.error("Error deleting company code:", error);
      res.status(500).json({
        message: "Errore durante l'eliminazione del codice aziendale",
      });
    }
  });

  // Endpoint per crittografare e verificare l'integrità di un documento
  app.post("/api/documents/:id/encrypt", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ message: "Percorso del file richiesto" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Esegui l'hash e la crittografia del documento
      const updatedDocument = await storage.hashAndEncryptDocument(
        id,
        filePath
      );

      // Log dell'operazione di crittografia
      if (req.user && updatedDocument && updatedDocument.encryptedCachePath) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "security",
          documentId: id,
          details: {
            message: `Documento criptato: ${document.title}`,
            filePath: filePath,
            timestamp: new Date().toISOString(),
            encryptedPath: updatedDocument.encryptedCachePath,
          },
        });
      }

      res.json({
        message: "Documento criptato con successo",
        document: updatedDocument,
      });
    } catch (error) {
      console.error("Encryption error:", error);
      res.status(500).json({ message: "Impossibile criptare il documento" });
    }
  });

  // Endpoint per verificare l'integrità di un documento
  app.get("/api/documents/:id/verify", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      if (!document.fileHash || !document.encryptedCachePath) {
        return res.status(400).json({
          message: "Il documento non è stato ancora criptato o non ha un hash",
          status: "not_encrypted",
        });
      }

      // Verifica l'integrità del documento
      const isValid = await storage.verifyDocumentIntegrity(id);

      // Log dell'operazione di verifica
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "security",
          documentId: id,
          details: {
            message: `Verifica integrità documento: ${document.title}`,
            result: isValid ? "valido" : "invalido",
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (isValid) {
        res.json({
          message: "Verifica integrità documento completata",
          status: "valid",
          document,
        });
      } else {
        res.status(400).json({
          message:
            "Verifica integrità fallita! Il documento potrebbe essere stato manomesso.",
          status: "invalid",
          document,
        });
      }
    } catch (error) {
      console.error("Integrity verification error:", error);
      res
        .status(500)
        .json({ message: "Impossibile verificare l'integrità del documento" });
    }
  });

  // Endpoint per generare un link sicuro di condivisione documento
  app.post("/api/documents/:id/share", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);
      const { action, expiryHours } = req.body;

      if (!action || !["view", "download"].includes(action)) {
        return res.status(400).json({
          message: "Azione non valida. Deve essere 'view' o 'download'",
        });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Converti le ore in millisecondi
      const expiryMs = (expiryHours || 24) * 60 * 60 * 1000;

      // Verifica se l'utente esiste prima di generare il link
      if (!req.user || !req.user.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      // Genera link sicuro
      const secureLink = generateSecureLink(
        id,
        req.user.legacyId,
        action,
        expiryMs
      );

      const absoluteUrl = `${req.protocol}://${req.get("host")}${secureLink}`;

      res.json({
        message: "Link di condivisione generato",
        shareLink: absoluteUrl,
        expires: new Date(Date.now() + expiryMs).toISOString(),
        documentId: id,
        action,
      });
    } catch (error) {
      console.error("Share link generation error:", error);
      res
        .status(500)
        .json({ message: "Impossibile generare il link di condivisione" });
    }
  });

  // Endpoint per gestire i link sicuri
  app.get("/api/secure/:encodedData/:expires/:signature", async (req, res) => {
    try {
      const { encodedData, expires, signature } = req.params;

      // Verifica il link
      const linkData = verifySecureLink(encodedData, expires, signature);

      if (!linkData) {
        return res.status(401).json({ message: "Link non valido o scaduto" });
      }

      if (linkData.action === "reset-password") {
        // Redirect alla pagina di reset password con token valido
        return res.redirect(
          `/reset-password?token=${encodedData}&expires=${expires}&signature=${signature}`
        );
      }

      // Se il documentId è null, è un errore per questo tipo di link (dovrebbe esserci per view/download)
      if (linkData.documentId === null) {
        return res
          .status(400)
          .json({ message: "Link non valido: documento non specificato" });
      }

      const document = await storage.getDocument(linkData.documentId);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Log dell'accesso tramite link sicuro
      await storage.createLog({
        userId: linkData.userId,
        action: `secure-link-${linkData.action}`,
        documentId: linkData.documentId,
        details: {
          message: `Accesso documento tramite link sicuro: ${document.title}`,
          action: linkData.action,
          timestamp: new Date().toISOString(),
        },
      });

      if (linkData.action === "view") {
        // Redirect alla visualizzazione del documento
        return res.redirect(
          `/documents/view/${linkData.documentId}?secure=true`
        );
      } else if (linkData.action === "download") {
        // Se il documento è criptato, decriptalo prima di inviarlo
        if (document.encryptedCachePath) {
          // Implementazione della risposta con file decriptato
          // Da integrare con crypto.ts
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${document.title}"`
          );
          return res.json({
            message: "Documento disponibile per il download",
            document: { ...document, secureAccess: true },
          });
        } else {
          return res.redirect(document.driveUrl);
        }
      }

      res.status(400).json({ message: "Azione non valida" });
    } catch (error) {
      console.error("Secure link error:", error);
      res
        .status(500)
        .json({ message: "Errore durante l'elaborazione del link sicuro" });
    }
  });

  // Endpoint per richiedere il reset della password
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email richiesta" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Per sicurezza, non rivelare che l'utente non esiste
        return res.json({
          message:
            "Se l'email è associata a un account, riceverai istruzioni per reimpostare la password",
        });
      }

      // Genera un link sicuro per il reset della password
      const resetLink = generateSecureLink(
        null,
        user.legacyId,
        "reset-password",
        1 * 60 * 60 * 1000 // 1 ora di validità
      );

      // TODO: Inviare email con link di reset (da integrare con mailer.ts)
      console.log(`Reset password link per ${email}: ${resetLink}`);

      // Log del tentativo di reset
      await storage.createLog({
        userId: user.legacyId,
        action: "password-reset-request",
        details: {
          message: "Richiesta reset password",
          timestamp: new Date().toISOString(),
        },
      });

      res.json({
        message:
          "Se l'email è associata a un account, riceverai istruzioni per reimpostare la password",
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res
        .status(500)
        .json({ message: "Errore durante la richiesta di reset password" });
    }
  });

  // Endpoint per verificare un link di reset password
  app.post("/api/verify-reset-link", async (req, res) => {
    try {
      const { data, expires, signature } = req.body;

      if (!data || !expires || !signature) {
        return res
          .status(400)
          .json({ success: false, message: "Parametri mancanti" });
      }

      // Verifica il link usando la funzione dal modulo secure-links
      const linkData = verifySecureLink(data, expires, signature);

      if (!linkData) {
        return res
          .status(400)
          .json({ success: false, message: "Link non valido o scaduto" });
      }

      // Controlla che l'azione sia corretta
      if (linkData.action !== "reset-password") {
        return res
          .status(400)
          .json({ success: false, message: "Tipo di link non valido" });
      }

      // Controlla che l'utente esista
      const user = await storage.getUser(linkData.userId);
      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Utente non trovato" });
      }

      // Link valido, restituisci i dati dell'utente (senza password)
      return res.status(200).json({
        success: true,
        data: {
          userId: user.legacyId,
          action: linkData.action,
        },
      });
    } catch (error) {
      console.error("Errore nella verifica del link di reset password:", error);
      return res.status(500).json({
        success: false,
        message: "Errore durante la verifica del link",
      });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      // La pagina di reset password può inviare direttamente userId e password
      // dopo aver verificato il link tramite /api/verify-reset-link
      const { userId, password, token, expires, signature } = req.body;

      // Gestisci sia il caso con token (vecchio) che con userId diretto (nuovo)
      let userIdToUpdate;

      if (userId) {
        // Usa l'ID utente direttamente se fornito
        userIdToUpdate = userId;
      } else if (token && expires && signature) {
        // Versione legacy: usa il token per ottenere l'ID utente
        const linkData = verifySecureLink(token, expires, signature);
        if (!linkData || linkData.action !== "reset-password") {
          return res
            .status(401)
            .json({ success: false, message: "Token non valido o scaduto" });
        }
        userIdToUpdate = linkData.userId;
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Dati incompleti" });
      }

      if (!password) {
        return res
          .status(400)
          .json({ success: false, message: "Password mancante" });
      }

      // Verificare l'esistenza dell'utente
      const user = await storage.getUser(userIdToUpdate);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Utente non trovato" });
      }

      // Aggiornare la password
      const hashedPassword = await hashPassword(password);
      const updatedUser = await storage.updateUserPassword(
        userIdToUpdate,
        hashedPassword
      );

      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          message: "Errore nell'aggiornamento della password",
        });
      }

      // Log dell'azione
      await storage.createLog({
        userId: userIdToUpdate,
        action: "password-reset-complete",
        details: {
          message: "Reset password completato",
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ success: true, message: "Password reimpostata con successo" });
    } catch (error) {
      console.error("Errore nel reset della password:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante il reset della password",
      });
    }
  });

  // Endpoint per creare un backup del sistema (solo admin)
  app.post("/api/backup", isAdmin, async (req, res) => {
    try {
      const backupResult = await storage.createBackup();

      if (!backupResult.success) {
        return res.status(500).json({
          message: "Impossibile creare il backup",
          error: backupResult.error,
        });
      }

      // Log dell'operazione di backup
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "backup-create",
          details: {
            message: "Backup del sistema creato",
            backupPath: backupResult.backupPath,
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        message: "Backup creato con successo",
        backupPath: backupResult.backupPath,
      });
    } catch (error) {
      console.error("Backup creation error:", error);
      res
        .status(500)
        .json({ message: "Errore durante la creazione del backup" });
    }
  });

  // Endpoint per ripristinare un backup (solo admin)
  app.post("/api/restore", isAdmin, async (req, res) => {
    try {
      const { backupPath } = req.body;

      if (!backupPath) {
        return res
          .status(400)
          .json({ message: "Percorso del backup richiesto" });
      }

      // Log dell'operazione di ripristino (prima del ripristino effettivo)
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "backup-restore-start",
          details: {
            message: "Tentativo di ripristino da backup",
            backupPath,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const restoreResult = await storage.restoreFromBackup(backupPath);

      if (!restoreResult.success) {
        return res.status(500).json({
          message: "Impossibile ripristinare il backup",
          error: restoreResult.error,
        });
      }

      // Dopo il ripristino del database, registriamo un nuovo log
      // Nota: questo log potrebbe non apparire se il ripristino ha cancellato i log precedenti
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "backup-restore-complete",
          details: {
            message: "Ripristino da backup completato",
            backupPath,
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        message: "Ripristino completato con successo",
      });
    } catch (error) {
      console.error("Backup restoration error:", error);
      res
        .status(500)
        .json({ message: "Errore durante il ripristino del backup" });
    }
  });

  // Endpoint per validare un file prima dell'upload
  app.post("/api/validate-file", isAuthenticated, async (req, res) => {
    try {
      const { filePath, fileSize, mimeType } = req.body;

      if (!filePath || fileSize === undefined || !mimeType) {
        return res
          .status(400)
          .json({ message: "Dati incompleti per la validazione" });
      }

      const validationResult = await storage.validateFileUpload(
        filePath,
        fileSize,
        mimeType
      );

      if (!validationResult.valid) {
        return res.status(400).json({
          message: "File non valido",
          errors: validationResult.errors,
        });
      }

      res.json({
        message: "File valido",
        valid: true,
      });
    } catch (error) {
      console.error("File validation error:", error);
      res
        .status(500)
        .json({ message: "Errore durante la validazione del file" });
    }
  });

  // Endpoint temporaneo per verificare utenti (solo in sviluppo)
  if (process.env.NODE_ENV === "development") {
    app.get("/api/debug/users", isAdmin, async (req, res) => {
      try {
        const users = await storage.getAllUsers();
        const safeUsers = users.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return {
            ...userWithoutPassword,
            passwordHash: password ? password.substring(0, 10) + "..." : null,
          };
        });
        res.json({
          count: users.length,
          users: safeUsers,
          storageType: storage.constructor.name,
        });
      } catch (error) {
        console.error("Debug endpoint error:", error);
        res.status(500).json({
          message: "Errore durante il recupero degli utenti",
          error: String(error),
        });
      }
    });
  }

  // Endpoint per impostare i giorni di preavviso personalizzati per un documento
  app.post("/api/documents/:id/warning-days", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);
      const { warningDays } = req.body;

      if (typeof warningDays !== "number" || warningDays < 1) {
        return res.status(400).json({
          message:
            "Il numero di giorni di preavviso deve essere un numero positivo",
        });
      }

      const result = await setCustomWarningDays(id, warningDays);

      if (!result) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Log dell'operazione
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "warning-update",
          documentId: id,
          details: {
            message: `Giorni di preavviso aggiornati a ${warningDays}`,
          },
        });
      }

      res.json({
        message: "Giorni di preavviso aggiornati con successo",
        warningDays,
      });
    } catch (error) {
      console.error("Warning days update error:", error);
      res
        .status(500)
        .json({ message: "Errore nell'aggiornamento dei giorni di preavviso" });
    }
  });

  // Rotta di diagnostica per verificare lo stato dell'autenticazione
  // Applica il middleware di timeout sessione per rinfrescare la sessione
  app.get("/api/auth-status", sessionTimeoutMiddleware, async (req, res) => {
    try {
      // Informazioni di debug per diagnosticare problemi di autenticazione
      const sessionActive = req.session?.legacyId ? true : false;
      const authenticated = req.isAuthenticated();
      const userInfo = req.user
        ? {
            id: req.user.legacyId,
            email: req.user.email,
            role: req.user.role,
            sessionExpiry: req.user.sessionExpiry,
          }
        : null;
      const sessionInfo = {
        id: req.session?.legacyId || null,
        cookie: req.session?.cookie
          ? {
              maxAge: req.session.cookie.maxAge,
              expires: req.session.cookie.expires,
              secure: req.session.cookie.secure,
              httpOnly: req.session.cookie.httpOnly,
            }
          : null,
      };

      res.json({
        authenticated,
        sessionActive,
        userInfo,
        sessionInfo,
      });
    } catch (error) {
      console.error("Error in auth status:", error);
      res.status(500).json({ message: "Error checking authentication status" });
    }
  });

  // Endpoint di debug per verificare lo stato del client e forzare una sincronizzazione
  app.get("/api/debug/client/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);
      const client = await storage.getClient(id);

      if (!client) {
        return res.status(404).json({ message: "Client non trovato" });
      }

      // Forza una sincronizzazione
      if (req.user) {
        await syncWithGoogleDrive(client.driveFolderId, req.user.legacyId);
      }

      res.json({
        client,
        message: "Sincronizzazione forzata completata",
      });
    } catch (error) {
      console.error("Debug client error:", error);
      res.status(500).json({ message: "Errore durante il debug del client" });
    }
  });

  // Avvio della sincronizzazione automatica ogni 15 minuti in background
  // Utilizziamo un utente di sistema (ID 1 tipicamente è admin) per i log delle operazioni automatiche
  startAutomaticSyncForAllClients();
  console.log(
    "Sincronizzazione automatica avviata in background ogni 15 minuti"
  );

  // Avvio del controllo automatico delle scadenze documentali (ogni 24 ore, con 30 giorni di preavviso)
  startExpirationChecks(24, 30);
  console.log(
    "Controllo automatico delle scadenze avviato in background (ogni 24 ore, 30 giorni di preavviso)"
  );

  const httpServer = createServer(app);
  return httpServer;
}
