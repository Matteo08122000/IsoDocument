import mongoose from "mongoose";
import { IStorage } from "./storage";
import {
  UserDocument as User,
  DocumentDocument as Document,
  LogDocument as Log,
  InsertUser,
  InsertDocument,
  InsertLog,
} from "../shared-types/schema";

import { ClientDocument as Client, InsertClient } from "../shared-types/client";

import {
  CompanyCodeDocument as CompanyCode,
  InsertCompanyCode,
} from "../shared-types/companycode";
import {
  UserModel,
  DocumentModel,
  LogModel,
  ClientModel,
  CompanyCodeModel,
  getNextSequence,
} from "./models/mongoose-models";
import {
  hashFile,
  encryptFile,
  decryptFile,
  verifyFileIntegrity,
} from "./crypto";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import createMemoryStore from "memorystore";
import session from "express-session";
import connectMongo from "connect-mongodb-session";

const MongoStore = connectMongo(session);

export class MongoStorage implements IStorage {
  private connected: boolean = false;
  sessionStore: session.Store;

  constructor() {
    this.connect();
    this.sessionStore = new MongoStore({
      uri: process.env.DB_URI || "",
      collection: "sessions",
    });

    // Create initial admin user if not exists
    this.ensureAdminUser();
  }

  private async connect() {
    if (!process.env.DB_URI) {
      throw new Error("MongoDB connection string not provided");
    }

    try {
      await mongoose.connect(process.env.DB_URI);
      console.log("Connected to MongoDB");
      this.connected = true;
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  /**
   * Verifica se è necessario creare l'utente admin predefinito
   * Questa funzione viene eseguita solo in modalità di sviluppo o testing
   * e solo se abilitata tramite variabile d'ambiente
   */
  private async ensureAdminUser() {
    try {
      // Controlla se è abilitata la creazione dell'admin predefinito
      const createDefaultAdmin = process.env.CREATE_DEFAULT_ADMIN === "true";

      // In produzione non creiamo l'admin automaticamente
      // a meno che non sia esplicitamente richiesto
      if (process.env.NODE_ENV === "production" && !createDefaultAdmin) {
        return;
      }

      // Verifica se esistono già degli utenti nel sistema
      const usersExist = (await UserModel.countDocuments().exec()) > 0;

      // Se ci sono già degli utenti o la creazione dell'admin non è attiva, termina
      if (usersExist || !createDefaultAdmin) {
        return;
      }

      // Altrimenti crea l'admin predefinito
      await this.createUser({
        email: process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com",
        password:
          process.env.DEFAULT_ADMIN_PASSWORD ||
          "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm", // 'password'
        role: "admin",
        lastLogin: null,
        sessionExpiry: null,
      });

      console.log("Initial admin user created");

      // Crea un log per questa operazione
      const admin = await this.getUserByEmail(
        process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com"
      );
      if (admin) {
        await this.createLog({
          userId: admin.id,
          action: "system_init",
          details: {
            message: "Default admin user created",
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error("Error ensuring admin user exists:", error);
    }
  }

  // Convert document IDs between systems (MongoDB uses string _id, our API expects numeric id)
  private convertToApiUser(user: any): User {
    return {
      id: user.legacyId,
      email: user.email,
      password: user.password,
      role: user.role,
      clientId: user.clientId,
      lastLogin: user.lastLogin,
      sessionExpiry: user.sessionExpiry,
      createdAt: user.createdAt,
    };
  }

  private convertToApiDocument(doc: any): Document {
    return {
      id: doc.legacyId,
      title: doc.title,
      path: doc.path,
      revision: doc.revision,
      driveUrl: doc.driveUrl,
      fileType: doc.fileType,
      alertStatus: doc.alertStatus,
      parentId: doc.parentId,
      isObsolete: doc.isObsolete,
      fileHash: doc.fileHash,
      encryptedCachePath: doc.encryptedCachePath,
      expiryDate: doc.expiryDate || null,
      warningDays: doc.warningDays || 30,
      clientId: doc.clientId || null,
      ownerId: doc.ownerId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private convertToApiLog(log: any): Log {
    return {
      id: log.id || log.legacyId,
      userId: log.userId,
      action: log.action,
      documentId: log.documentId,
      details: log.details,
      timestamp: log.timestamp,
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ legacyId: id }).exec();
      return user ? this.convertToApiUser(user) : undefined;
    } catch (error) {
      console.error("MongoDB getUser error:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({
        email: email.toLowerCase(),
      }).exec();
      return user ? this.convertToApiUser(user) : undefined;
    } catch (error) {
      console.error("MongoDB getUserByEmail error:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Use auto-incrementing sequence for ID
      const legacyId = await getNextSequence("userId");
      const user = new UserModel({
        ...insertUser,
        id: legacyId,
        legacyId,
        createdAt: new Date(),
      });
      await user.save();
      return this.convertToApiUser(user);
    } catch (error) {
      console.error("MongoDB createUser error:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await UserModel.find().exec();
      return users.map((user) => this.convertToApiUser(user));
    } catch (error) {
      console.error("MongoDB getAllUsers error:", error);
      return [];
    }
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOneAndUpdate(
        { legacyId: id },
        { role },
        { new: true }
      ).exec();
      return user ? this.convertToApiUser(user) : undefined;
    } catch (error) {
      console.error("MongoDB updateUserRole error:", error);
      return undefined;
    }
  }

  async updateUserSession(
    id: number,
    lastLogin: Date | null,
    sessionExpiry: Date | null
  ): Promise<User | undefined> {
    try {
      const updateData: any = {};
      if (lastLogin !== null) updateData.lastLogin = lastLogin;
      if (sessionExpiry !== null) updateData.sessionExpiry = sessionExpiry;

      const user = await UserModel.findOneAndUpdate(
        { legacyId: id },
        updateData,
        { new: true }
      ).exec();
      return user ? this.convertToApiUser(user) : undefined;
    } catch (error) {
      console.error("MongoDB updateUserSession error:", error);
      return undefined;
    }
  }

  async updateUserPassword(
    id: number,
    hashedPassword: string
  ): Promise<User | undefined> {
    try {
      console.log(`Aggiornamento password per utente ${id}`);
      const user = await UserModel.findOneAndUpdate(
        { legacyId: id },
        { password: hashedPassword },
        { new: true }
      ).exec();

      if (!user) {
        console.error(
          `Utente ${id} non trovato durante l'aggiornamento della password`
        );
        return undefined;
      }

      console.log(`Password aggiornata con successo per l'utente ${id}`);
      return this.convertToApiUser(user);
    } catch (error) {
      console.error("MongoDB updateUserPassword error:", error);
      return undefined;
    }
  }

  async updateUserClient(
    id: number,
    clientId: number | null
  ): Promise<User | undefined> {
    try {
      const user = await UserModel.findOneAndUpdate(
        { legacyId: id },
        { clientId },
        { new: true }
      ).exec();
      return user ? this.convertToApiUser(user) : undefined;
    } catch (error) {
      console.error("MongoDB updateUserClient error:", error);
      return undefined;
    }
  }

  // Client methods
  private convertToApiClient(client: any): Client {
    return {
      id: client.legacyId,
      legacyId: client.legacyId,
      name: client.name,
      driveFolderId: client.driveFolderId,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  async getClient(id: number): Promise<Client | undefined> {
    try {
      const client = await ClientModel.findOne({ legacyId: id }).exec();
      return client ? this.convertToApiClient(client) : undefined;
    } catch (error) {
      console.error("MongoDB getClient error:", error);
      return undefined;
    }
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    try {
      const client = await ClientModel.findOne({ name }).exec();
      return client ? this.convertToApiClient(client) : undefined;
    } catch (error) {
      console.error("MongoDB getClientByName error:", error);
      return undefined;
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      // Use auto-incrementing sequence for ID
      const legacyId = await getNextSequence("clientId");
      const newClient = new ClientModel({
        ...client,
        legacyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await newClient.save();
      return this.convertToApiClient(newClient);
    } catch (error) {
      console.error("MongoDB createClient error:", error);
      throw error;
    }
  }

  async getAllClients(): Promise<Client[]> {
    try {
      const clients = await ClientModel.find().exec();
      return clients.map((client) => this.convertToApiClient(client));
    } catch (error) {
      console.error("MongoDB getAllClients error:", error);
      return [];
    }
  }

  async updateClient(
    id: number,
    clientUpdate: Partial<InsertClient>
  ): Promise<Client | undefined> {
    try {
      const client = await ClientModel.findOneAndUpdate(
        { legacyId: id },
        {
          ...clientUpdate,
          updatedAt: new Date(),
        },
        { new: true }
      ).exec();
      return client ? this.convertToApiClient(client) : undefined;
    } catch (error) {
      console.error("MongoDB updateClient error:", error);
      return undefined;
    }
  }

  async updateClientTokens(
    clientId: number,
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
    }
  ): Promise<void> {
    await ClientModel.updateOne(
      { legacyId: clientId },
      {
        $set: {
          google: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiryDate: tokens.expiryDate,
          },
        },
        $unset: {
          driveAccessToken: "",
          driveRefreshToken: "",
        },
      }
    );
  }

  async getFolderIdForUser(userId: number): Promise<string | undefined> {
    try {
      // Trova l'utente e il suo clientId associato
      const user = await UserModel.findOne({ legacyId: userId }).exec();
      if (!user || user.clientId === null) return undefined;

      // Trova il client associato all'utente e restituisci il suo driveFolderId
      const client = await ClientModel.findOne({
        legacyId: user.clientId,
      }).exec();
      return client ? client.driveFolderId : undefined;
    } catch (error) {
      console.error("MongoDB getFolderIdForUser error:", error);
      return undefined;
    }
  }

  // Document methods
  async getAllDocuments(): Promise<Document[]> {
    try {
      const documents = await DocumentModel.find({ isObsolete: false }).exec();
      const result = documents.map((doc) => this.convertToApiDocument(doc));

      // Sort by ISO path (e.g., "1.2.3")
      return result.sort((a, b) => {
        const aParts = a.path.split(".").map(Number);
        const bParts = b.path.split(".").map(Number);

        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
          if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i];
          }
        }

        return aParts.length - bParts.length;
      });
    } catch (error) {
      console.error("MongoDB getAllDocuments error:", error);
      return [];
    }
  }

  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const document = await DocumentModel.findOne({ legacyId: id }).exec();
      return document ? this.convertToApiDocument(document) : undefined;
    } catch (error) {
      console.error("MongoDB getDocument error:", error);
      return undefined;
    }
  }

  async getDocumentsByPathAndTitle(
    path: string,
    title: string
  ): Promise<Document[]> {
    try {
      const documents = await DocumentModel.find({ path, title }).exec();
      return documents.map((doc) => this.convertToApiDocument(doc));
    } catch (error) {
      console.error("MongoDB getDocumentsByPathAndTitle error:", error);
      return [];
    }
  }

  async getDocumentByPathAndTitleAndRevision(
    path: string,
    title: string,
    revision: string
  ): Promise<Document | undefined> {
    try {
      const doc = await DocumentModel.findOne({ path, title, revision }).exec();
      return doc ? this.convertToApiDocument(doc) : undefined;
    } catch (error) {
      console.error(
        "MongoDB getDocumentByPathAndTitleAndRevision error:",
        error
      );
      return undefined;
    }
  }

  async getObsoleteDocuments(): Promise<Document[]> {
    try {
      const documents = await DocumentModel.find({ isObsolete: true }).exec();
      return documents.map((doc) => this.convertToApiDocument(doc));
    } catch (error) {
      console.error("MongoDB getObsoleteDocuments error:", error);
      return [];
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    try {
      // Use auto-incrementing sequence for ID
      const legacyId = await getNextSequence("documentId");
      const document = new DocumentModel({
        ...insertDocument,
        legacyId, // ID numerico per compatibilità API
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await document.save();
      return this.convertToApiDocument(document);
    } catch (error) {
      console.error("MongoDB createDocument error:", error);
      throw error;
    }
  }

  async updateDocument(
    id: number,
    documentUpdate: Partial<InsertDocument>
  ): Promise<Document | undefined> {
    try {
      const document = await DocumentModel.findOneAndUpdate(
        { legacyId: id },
        {
          ...documentUpdate,
          updatedAt: new Date(),
        },
        { new: true }
      ).exec();
      return document ? this.convertToApiDocument(document) : undefined;
    } catch (error) {
      console.error("MongoDB updateDocument error:", error);
      return undefined;
    }
  }

  async markDocumentObsolete(id: number): Promise<Document | undefined> {
    try {
      const document = await DocumentModel.findOneAndUpdate(
        { legacyId: id },
        {
          isObsolete: true,
          updatedAt: new Date(),
        },
        { new: true }
      ).exec();
      return document ? this.convertToApiDocument(document) : undefined;
    } catch (error) {
      console.error("MongoDB markDocumentObsolete error:", error);
      return undefined;
    }
  }

  async hashAndEncryptDocument(
    id: number,
    filePath: string
  ): Promise<Document | undefined> {
    try {
      const document = await DocumentModel.findOne({ legacyId: id }).exec();
      if (!document) return undefined;

      // Create cache folder if doesn't exist
      const cacheDir = path.join(process.cwd(), "encrypted_cache");
      await promisify(fs.mkdir)(cacheDir, { recursive: true });

      // Generate encrypted filename with document ID to avoid collisions
      const encryptedPath = path.join(
        cacheDir,
        `doc_${id}_${path.basename(filePath)}.enc`
      );

      // Calculate file hash for integrity check
      const fileHash = await hashFile(filePath);

      // Encrypt the file
      await encryptFile(filePath, encryptedPath);

      // Update document with hash and encrypted path
      const updatedDocument = await DocumentModel.findOneAndUpdate(
        { legacyId: id },
        {
          fileHash,
          encryptedCachePath: encryptedPath,
          updatedAt: new Date(),
        },
        { new: true }
      ).exec();

      return updatedDocument
        ? this.convertToApiDocument(updatedDocument)
        : undefined;
    } catch (error) {
      console.error(
        `MongoDB hashAndEncryptDocument error for document ${id}:`,
        error
      );
      // Return the original document if encryption fails
      const document = await DocumentModel.findOne({ legacyId: id }).exec();
      return document ? this.convertToApiDocument(document) : undefined;
    }
  }

  async verifyDocumentIntegrity(id: number): Promise<boolean> {
    try {
      const document = await DocumentModel.findOne({ legacyId: id }).exec();
      if (!document || !document.fileHash || !document.encryptedCachePath)
        return false;

      // Verify the encrypted file exists
      if (!fs.existsSync(document.encryptedCachePath)) return false;

      // For integrity check, we need to first decrypt the file to a temp location
      // then check hash, then delete the temp file
      const tempDir = path.join(process.cwd(), "temp");
      await promisify(fs.mkdir)(tempDir, { recursive: true });

      const tempFilePath = path.join(tempDir, `verify_${id}_${Date.now()}`);

      // Decrypt to temp file
      await decryptFile(document.encryptedCachePath, tempFilePath);

      // Check integrity
      const isValid = await verifyFileIntegrity(
        tempFilePath,
        document.fileHash
      );

      // Clean up temp file
      await promisify(fs.unlink)(tempFilePath);

      return isValid;
    } catch (error) {
      console.error(
        `MongoDB verifyDocumentIntegrity error for document ${id}:`,
        error
      );
      return false;
    }
  }

  // Log methods
  async createLog(
    insertLog: Omit<InsertLog, "documentId"> & { documentId?: number }
  ): Promise<Log> {
    try {
      // Use auto-incrementing sequence for ID
      const legacyId = await getNextSequence("logId");
      const log = new LogModel({
        ...insertLog,
        id: legacyId,
        legacyId,
        documentId: insertLog.documentId || null,
        timestamp: new Date(),
      });
      await log.save();
      return this.convertToApiLog(log);
    } catch (error) {
      console.error("MongoDB createLog error:", error);
      throw error;
    }
  }

  async getAllLogs(): Promise<Log[]> {
    try {
      const logs = await LogModel.find().sort({ timestamp: -1 }).exec();
      return logs.map((log) => this.convertToApiLog(log));
    } catch (error) {
      console.error("MongoDB getAllLogs error:", error);
      return [];
    }
  }

  async validateFileUpload(
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Controllo dimensione massima (20MB)
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (fileSize > MAX_SIZE) {
      errors.push(
        `Il file è troppo grande. Dimensione massima: ${
          MAX_SIZE / (1024 * 1024)
        }MB`
      );
    }

    // Controllo estensione e mime type
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      errors.push(
        "Tipo di file non supportato. I formati consentiti sono: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG"
      );
    }

    // Controllo pattern del nome file (se segue standard ISO)
    const filename = path.basename(filePath);
    const isoPattern =
      /^\d+(\.\d+)*_[\w\s]+_Rev\.\d+_\d{4}-\d{2}-\d{2}\.[a-zA-Z]+$/;

    if (!isoPattern.test(filename)) {
      errors.push(
        "Il nome del file non segue lo standard ISO richiesto: N.N.N_TitoloProcedura_Rev.N_YYYY-MM-DD.ext"
      );
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    if (!this.connected) {
      return {
        success: false,
        error: "Database non connesso",
      };
    }

    try {
      // Crea cartella di backup se non esiste
      const backupDir = path.join(process.cwd(), "backups");
      await promisify(fs.mkdir)(backupDir, { recursive: true });

      // Genera nome file con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `backup_${timestamp}.json`);

      // Recupera tutti i dati dal database
      const users = await UserModel.find().lean().exec();
      const documents = await DocumentModel.find().lean().exec();
      const logs = await LogModel.find().lean().exec();

      // Prepara i dati per il backup
      const data = {
        users,
        documents,
        logs,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      // Scrive il file di backup
      await promisify(fs.writeFile)(
        backupPath,
        JSON.stringify(data, null, 2),
        "utf8"
      );

      return {
        success: true,
        backupPath,
      };
    } catch (error) {
      console.error("MongoDB createBackup error:", error);
      return {
        success: false,
        error: `Errore durante la creazione del backup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  async restoreFromBackup(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) {
      return {
        success: false,
        error: "Database non connesso",
      };
    }

    try {
      // Verifica che il file esista
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          error: `Il file di backup non esiste: ${backupPath}`,
        };
      }

      // Legge il file di backup
      const backupData = JSON.parse(
        await promisify(fs.readFile)(backupPath, "utf8")
      );

      // Verifica struttura del backup
      if (!backupData.users || !backupData.documents || !backupData.logs) {
        return {
          success: false,
          error: "Il file di backup non contiene dati validi",
        };
      }

      // Backup delle collezioni attuali prima di sovrascrivere
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safetyBackupPath = path.join(
        process.cwd(),
        "backups",
        `pre_restore_${timestamp}.json`
      );

      await this.createBackup().catch((err) =>
        console.error("Errore nel creare backup di sicurezza:", err)
      );

      // Elimina tutti i dati dal database
      await UserModel.deleteMany({}).exec();
      await DocumentModel.deleteMany({}).exec();
      await LogModel.deleteMany({}).exec();

      // Inserisce i dati dal backup
      await UserModel.insertMany(backupData.users);
      await DocumentModel.insertMany(backupData.documents);
      await LogModel.insertMany(backupData.logs);

      return { success: true };
    } catch (error) {
      console.error("MongoDB restoreFromBackup error:", error);
      return {
        success: false,
        error: `Errore durante il ripristino del backup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /* Company Code Methods */

  private convertToApiCompanyCode(companyCode: any): CompanyCode {
    return {
      id: companyCode.legacyId,
      code: companyCode.code,
      role: companyCode.role,
      usageLimit: companyCode.usageLimit,
      usageCount: companyCode.usageCount,
      expiresAt: companyCode.expiresAt ? new Date(companyCode.expiresAt) : null,
      isActive: companyCode.isActive,
      createdBy: companyCode.createdBy,
      createdAt: new Date(companyCode.createdAt),
      updatedAt: new Date(companyCode.updatedAt),
    };
  }

  async createCompanyCode(
    companyCode: InsertCompanyCode
  ): Promise<CompanyCode> {
    if (!this.connected) {
      throw new Error("Database non connesso");
    }

    try {
      const legacyId = await getNextSequence("company_code_id");

      const newCompanyCode = new CompanyCodeModel({
        ...companyCode,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        legacyId,
      });

      await newCompanyCode.save();
      return this.convertToApiCompanyCode(newCompanyCode);
    } catch (error) {
      console.error("MongoDB createCompanyCode error:", error);
      throw error;
    }
  }

  async getCompanyCode(id: number): Promise<CompanyCode | undefined> {
    if (!this.connected) {
      throw new Error("Database non connesso");
    }

    try {
      const companyCode = await CompanyCodeModel.findOne({ legacyId: id });
      if (!companyCode) return undefined;
      return this.convertToApiCompanyCode(companyCode);
    } catch (error) {
      console.error("MongoDB getCompanyCode error:", error);
      throw error;
    }
  }

  async getCompanyCodeByCode(code: string): Promise<CompanyCode | undefined> {
    if (!this.connected) {
      throw new Error("Database non connesso");
    }

    try {
      const companyCode = await CompanyCodeModel.findOne({ code });
      if (!companyCode) return undefined;
      return this.convertToApiCompanyCode(companyCode);
    } catch (error) {
      console.error("MongoDB getCompanyCodeByCode error:", error);
      throw error;
    }
  }

  async getAllCompanyCodes(): Promise<CompanyCode[]> {
    if (!this.connected) {
      throw new Error("Database non connesso");
    }

    try {
      const companyCodes = await CompanyCodeModel.find({}).sort({
        createdAt: -1,
      });
      return companyCodes.map((code) => this.convertToApiCompanyCode(code));
    } catch (error) {
      console.error("MongoDB getAllCompanyCodes error:", error);
      throw error;
    }
  }

  async updateCompanyCode(
    id: number,
    update: Partial<InsertCompanyCode>
  ): Promise<CompanyCode | undefined> {
    if (!this.connected) {
      throw new Error("Database non connesso");
    }

    try {
      const companyCode = await CompanyCodeModel.findOneAndUpdate(
        { legacyId: id },
        {
          ...update,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!companyCode) return undefined;
      return this.convertToApiCompanyCode(companyCode);
    } catch (error) {
      console.error("MongoDB updateCompanyCode error:", error);
      throw error;
    }
  }

  async deleteCompanyCode(id: number): Promise<boolean> {
    if (!this.connected) {
      throw new Error("Database non connesso");
    }

    try {
      const result = await CompanyCodeModel.deleteOne({ legacyId: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("MongoDB deleteCompanyCode error:", error);
      throw error;
    }
  }

  async verifyCompanyCode(
    code: string
  ): Promise<{ valid: boolean; role?: string; codeId?: number }> {
    if (!this.connected) {
      return { valid: false };
    }

    try {
      const companyCode = await CompanyCodeModel.findOne({ code });

      if (!companyCode) {
        return { valid: false };
      }

      // Verifica se il codice è attivo
      if (!companyCode.isActive) {
        return { valid: false };
      }

      // Verifica se il codice è scaduto
      if (
        companyCode.expiresAt &&
        new Date() > new Date(companyCode.expiresAt)
      ) {
        return { valid: false };
      }

      // Verifica se il codice ha raggiunto il limite di utilizzo
      if (companyCode.usageCount >= companyCode.usageLimit) {
        return { valid: false };
      }

      return {
        valid: true,
        role: companyCode.role,
        codeId: companyCode.legacyId,
      };
    } catch (error) {
      console.error("MongoDB verifyCompanyCode error:", error);
      return { valid: false };
    }
  }

  async incrementCompanyCodeUsage(
    id: number
  ): Promise<CompanyCode | undefined> {
    if (!this.connected) {
      throw new Error("Database non connesso");
    }

    try {
      const companyCode = await CompanyCodeModel.findOneAndUpdate(
        { legacyId: id },
        {
          $inc: { usageCount: 1 },
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!companyCode) return undefined;
      return this.convertToApiCompanyCode(companyCode);
    } catch (error) {
      console.error("MongoDB incrementCompanyCodeUsage error:", error);
      throw error;
    }
  }
}

// Esporta l'istanza dello storage MongoDB

export const mongoStorage = new MongoStorage();
