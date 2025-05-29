import session from "express-session";
import createMemoryStore from "memorystore";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import {
  encryptFile,
  decryptFile,
  hashFile,
  verifyFileIntegrity,
} from "./crypto";

const MemoryStore = createMemoryStore(session);

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

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserSession(
    id: number,
    lastLogin: Date | null,
    sessionExpiry: Date | null
  ): Promise<User | undefined>;
  updateUserPassword(
    id: number,
    hashedPassword: string
  ): Promise<User | undefined>;
  updateUserClient(
    id: number,
    clientId: number | null
  ): Promise<User | undefined>;

  // Document methods
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByPathAndTitle(path: string, title: string): Promise<Document[]>;
  getObsoleteDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(
    id: number,
    document: Partial<InsertDocument>
  ): Promise<Document | undefined>;
  markDocumentObsolete(id: number): Promise<Document | undefined>;
  hashAndEncryptDocument(
    id: number,
    filePath: string
  ): Promise<Document | undefined>;
  verifyDocumentIntegrity(id: number): Promise<boolean>;
  validateFileUpload(
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<{ valid: boolean; errors?: string[] }>;

  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClientByName(name: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  updateClient(
    id: number,
    client: Partial<InsertClient>
  ): Promise<Client | undefined>;
  getFolderIdForUser(userId: number): Promise<string | undefined>;

  // Company Code methods
  createCompanyCode(code: InsertCompanyCode): Promise<CompanyCode>;
  getCompanyCode(id: number): Promise<CompanyCode | undefined>;
  getCompanyCodeByCode(code: string): Promise<CompanyCode | undefined>;
  getAllCompanyCodes(): Promise<CompanyCode[]>;
  updateCompanyCode(
    id: number,
    code: Partial<InsertCompanyCode>
  ): Promise<CompanyCode | undefined>;
  deleteCompanyCode(id: number): Promise<boolean>;
  verifyCompanyCode(
    code: string
  ): Promise<{ valid: boolean; role?: string; codeId?: number }>;
  incrementCompanyCodeUsage(id: number): Promise<CompanyCode | undefined>;

  // Log methods
  createLog(
    log: Omit<InsertLog, "documentId"> & { documentId?: number }
  ): Promise<Log>;
  getAllLogs(): Promise<Log[]>;

  // Backup methods
  createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }>;
  restoreFromBackup(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private logs: Map<number, Log>;
  private clients: Map<number, Client>;
  private companyCodes: Map<number, CompanyCode>;
  private userIdCounter: number;
  private documentIdCounter: number;
  private logIdCounter: number;
  private clientIdCounter: number;
  private companyCodeIdCounter: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.logs = new Map();
    this.clients = new Map();
    this.companyCodes = new Map();
    this.userIdCounter = 1;
    this.documentIdCounter = 1;
    this.logIdCounter = 1;
    this.clientIdCounter = 1;
    this.companyCodeIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    // Create initial admin user
    this.createUser({
      email: "admin@example.com",
      password: "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm", // 'password'
      role: "admin",
      lastLogin: null,
      sessionExpiry: null,
    });

    // Crea un codice aziendale di esempio per i test (in ambiente di sviluppo)
    if (process.env.NODE_ENV === "development") {
      this.createCompanyCode({
        code: "ADMIN123",
        role: "admin",
        usageLimit: 5,
        expiresAt: null,
        isActive: true,
        createdBy: 1, // ID del primo admin
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    // Assicuriamoci che tutti i campi obbligatori siano presenti
    const user: User = {
      ...insertUser,
      id,
      createdAt: createdAt || null,
      role: insertUser.role || "user",
      clientId: insertUser.clientId || null,
      lastLogin: insertUser.lastLogin || null,
      sessionExpiry: insertUser.sessionExpiry || null,
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, role };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserSession(
    id: number,
    lastLogin: Date | null,
    sessionExpiry: Date | null
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      lastLogin: lastLogin !== null ? lastLogin : user.lastLogin,
      sessionExpiry:
        sessionExpiry !== null ? sessionExpiry : user.sessionExpiry,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(
    id: number,
    hashedPassword: string
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      password: hashedPassword,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserClient(
    id: number,
    clientId: number | null
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      clientId,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.name === name
    );
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();

    const newClient: Client = {
      ...client,
      id,
      createdAt,
      updatedAt,
    };

    this.clients.set(id, newClient);
    return newClient;
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async updateClient(
    id: number,
    clientUpdate: Partial<InsertClient>
  ): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient = {
      ...client,
      ...clientUpdate,
      updatedAt: new Date(),
    };

    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async getFolderIdForUser(userId: number): Promise<string | undefined> {
    const user = this.users.get(userId);
    if (!user || !user.clientId) return undefined;

    const client = this.clients.get(user.clientId);
    return client ? client.driveFolderId : undefined;
  }

  // Document methods
  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter((doc) => !doc.isObsolete)
      .sort((a, b) => {
        // Sort by ISO path (e.g., "1.2.3")
        const aParts = a.path.split(".").map(Number);
        const bParts = b.path.split(".").map(Number);

        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
          if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i];
          }
        }

        return aParts.length - bParts.length;
      });
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByPathAndTitle(
    path: string,
    title: string
  ): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.path === path && doc.title === title
    );
  }

  async getObsoleteDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).filter((doc) => doc.isObsolete);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: createdAt || null,
      updatedAt: updatedAt || null,
      alertStatus: insertDocument.alertStatus || null,
      parentId: insertDocument.parentId || null,
      isObsolete: insertDocument.isObsolete || null,
      fileHash: insertDocument.fileHash || null,
      encryptedCachePath: insertDocument.encryptedCachePath || null,
      expiryDate: insertDocument.expiryDate || null,
      warningDays: insertDocument.warningDays || 30,
      clientId: insertDocument.clientId || null,
      ownerId: insertDocument.ownerId || null,
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(
    id: number,
    documentUpdate: Partial<InsertDocument>
  ): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    const updatedDocument = {
      ...document,
      ...documentUpdate,
      updatedAt: new Date(),
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async markDocumentObsolete(id: number): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    const updatedDocument = {
      ...document,
      isObsolete: true,
      updatedAt: new Date(),
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  /**
   * Hash a document file and encrypt it for secure storage
   * @param id Document ID
   * @param filePath Path to original file
   * @returns Updated document or undefined if document not found
   */
  async hashAndEncryptDocument(
    id: number,
    filePath: string
  ): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    try {
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
      const updatedDocument = {
        ...document,
        fileHash,
        encryptedCachePath: encryptedPath,
        updatedAt: new Date(),
      };
      this.documents.set(id, updatedDocument);
      return updatedDocument;
    } catch (error) {
      console.error(`Error encrypting document ${id}:`, error);
      return document; // Return original document if encryption fails
    }
  }

  /**
   * Verify document integrity by comparing stored hash with current file hash
   * @param id Document ID
   * @returns True if integrity verified, false otherwise
   */
  async verifyDocumentIntegrity(id: number): Promise<boolean> {
    const document = this.documents.get(id);
    if (!document || !document.fileHash || !document.encryptedCachePath)
      return false;

    try {
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
      console.error(`Error verifying document ${id} integrity:`, error);
      return false;
    }
  }

  // Log methods
  async createLog(
    insertLog: Omit<InsertLog, "documentId"> & { documentId?: number }
  ): Promise<Log> {
    const id = this.logIdCounter++;
    const timestamp = new Date();
    const log: Log = {
      ...insertLog,
      id,
      documentId: insertLog.documentId || null,
      timestamp: timestamp || null,
      details: insertLog.details || {},
    };
    this.logs.set(id, log);
    return log;
  }

  async getAllLogs(): Promise<Log[]> {
    return Array.from(this.logs.values()).sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Valida un file prima dell'upload
   * @param filePath Percorso del file
   * @param fileSize Dimensione del file in bytes
   * @param mimeType Tipo MIME del file
   * @returns Oggetto con il risultato della validazione
   */
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

  // Company Code methods
  async createCompanyCode(code: InsertCompanyCode): Promise<CompanyCode> {
    const id = this.companyCodeIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();

    const newCode: CompanyCode = {
      id,
      code: code.code,
      role: code.role || "admin", // Default a admin se non specificato
      usageLimit: code.usageLimit || 1, // Default a 1 se non specificato
      usageCount: 0,
      expiresAt: code.expiresAt || null,
      isActive: code.isActive !== undefined ? code.isActive : true, // Default a true se non specificato
      createdBy: code.createdBy,
      createdAt,
      updatedAt,
    };

    this.companyCodes.set(id, newCode);
    return newCode;
  }

  async getCompanyCode(id: number): Promise<CompanyCode | undefined> {
    return this.companyCodes.get(id);
  }

  async getCompanyCodeByCode(code: string): Promise<CompanyCode | undefined> {
    return Array.from(this.companyCodes.values()).find(
      (companyCode) => companyCode.code.toLowerCase() === code.toLowerCase()
    );
  }

  async getAllCompanyCodes(): Promise<CompanyCode[]> {
    return Array.from(this.companyCodes.values());
  }

  async updateCompanyCode(
    id: number,
    codeUpdate: Partial<InsertCompanyCode>
  ): Promise<CompanyCode | undefined> {
    const code = this.companyCodes.get(id);
    if (!code) return undefined;

    const updatedCode = {
      ...code,
      ...codeUpdate,
      updatedAt: new Date(),
    };

    this.companyCodes.set(id, updatedCode);
    return updatedCode;
  }

  async deleteCompanyCode(id: number): Promise<boolean> {
    const exists = this.companyCodes.has(id);
    if (exists) {
      this.companyCodes.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Verifica se un codice aziendale è valido
   * @param code Codice da verificare
   * @returns Oggetto con il risultato della verifica
   */
  async verifyCompanyCode(
    code: string
  ): Promise<{ valid: boolean; role?: string; codeId?: number }> {
    // Se il codice è vuoto o null, è considerato non valido
    if (!code) {
      return { valid: false };
    }

    const companyCode = await this.getCompanyCodeByCode(code);

    // Se il codice non esiste nel database
    if (!companyCode) {
      return { valid: false };
    }

    // Verifica se il codice è attivo
    if (!companyCode.isActive) {
      return { valid: false };
    }

    // Verifica se il codice è scaduto
    if (companyCode.expiresAt && new Date() > companyCode.expiresAt) {
      return { valid: false };
    }

    // Verifica se il codice ha raggiunto il limite di utilizzi
    if (companyCode.usageCount >= companyCode.usageLimit) {
      return { valid: false };
    }

    // Se arriviamo qui, il codice è valido
    return {
      valid: true,
      role: companyCode.role,
      codeId: companyCode.legacyId,
    };
  }

  /**
   * Incrementa il contatore di utilizzo di un codice aziendale
   * @param id ID del codice aziendale
   * @returns Il codice aziendale aggiornato o undefined se non trovato
   */
  async incrementCompanyCodeUsage(
    id: number
  ): Promise<CompanyCode | undefined> {
    const code = this.companyCodes.get(id);
    if (!code) return undefined;

    const updatedCode = {
      ...code,
      usageCount: code.usageCount + 1,
      updatedAt: new Date(),
    };

    this.companyCodes.set(id, updatedCode);
    return updatedCode;
  }

  /**
   * Crea un backup del database
   * @returns Informazioni sul backup creato
   */
  async createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    try {
      // Crea cartella di backup se non esiste
      const backupDir = path.join(process.cwd(), "backups");
      await promisify(fs.mkdir)(backupDir, { recursive: true });

      // Genera nome file con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `backup_${timestamp}.json`);

      // Raccoglie i dati da salvare
      const data = {
        users: Array.from(this.users.values()),
        documents: Array.from(this.documents.values()),
        logs: Array.from(this.logs.values()),
        clients: Array.from(this.clients.values()),
        companyCodes: Array.from(this.companyCodes.values()),
        counters: {
          userIdCounter: this.userIdCounter,
          documentIdCounter: this.documentIdCounter,
          logIdCounter: this.logIdCounter,
          clientIdCounter: this.clientIdCounter,
          companyCodeIdCounter: this.companyCodeIdCounter,
        },
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
      console.error("Errore durante la creazione del backup:", error);
      return {
        success: false,
        error: `Errore durante la creazione del backup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Ripristina un database da un backup
   * @param backupPath Percorso del file di backup
   * @returns Risultato dell'operazione
   */
  async restoreFromBackup(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }> {
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
      if (
        !backupData.users ||
        !backupData.documents ||
        !backupData.logs ||
        !backupData.counters
      ) {
        return {
          success: false,
          error: "Il file di backup non contiene dati validi",
        };
      }

      // Pulisce le collezioni esistenti
      this.users.clear();
      this.documents.clear();
      this.logs.clear();
      this.clients.clear();
      this.companyCodes.clear();

      // Ripristina i dati
      backupData.users.forEach((user: User) => {
        this.users.set(user.legacyId, user);
      });

      backupData.documents.forEach((document: Document) => {
        this.documents.set(document.legacyId, document);
      });

      backupData.logs.forEach((log: Log) => {
        this.logs.set(log.legacyId, log);
      });

      // Ripristina i client se presenti nel backup
      if (backupData.clients) {
        backupData.clients.forEach((client: Client) => {
          this.clients.set(client.legacyId, client);
        });
      }

      // Ripristina i codici aziendali se presenti nel backup
      if (backupData.companyCodes) {
        backupData.companyCodes.forEach((code: CompanyCode) => {
          this.companyCodes.set(code.legacyId, code);
        });
      }

      // Ripristina i contatori
      this.userIdCounter = backupData.counters.userIdCounter;
      this.documentIdCounter = backupData.counters.documentIdCounter;
      this.logIdCounter = backupData.counters.logIdCounter;
      this.clientIdCounter = backupData.counters.clientIdCounter || 1;
      this.companyCodeIdCounter = backupData.counters.companyCodeIdCounter || 1;

      return { success: true };
    } catch (error) {
      console.error("Errore durante il ripristino del backup:", error);
      return {
        success: false,
        error: `Errore durante il ripristino del backup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}

export const storage = new MemStorage();
