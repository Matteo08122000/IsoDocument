export interface UserDocument {
  email: string;
  password: string;
  role: string;
  clientId: number | null;
  lastLogin: Date | null;
  sessionExpiry: Date | null;
  createdAt: Date | null;
  legacyId: number;
}

export interface DocumentDocument {
  title: string;
  path: string;
  revision: string;
  driveUrl: string;
  fileType: string;
  alertStatus: string;
  expiryDate: Date | null;
  parentId: number | null;
  isObsolete: boolean;
  fileHash: string | null;
  encryptedCachePath: string | null;
  ownerId: number | null;
  clientId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  legacyId: number;
}

export interface InsertDocumento {
  title: string;
  path: string;
  revision: string;
  driveUrl: string;
  fileType: string;
  alertStatus?: string;
  expiryDate?: Date | null; // ✅ Aggiungi questa riga
  parentId?: number | null;
  isObsolete?: boolean;
  fileHash?: string | null;
  encryptedCachePath?: string | null;
  clientId?: number;
  ownerId?: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  legacyId: number;
}

export type InsertDocument = Omit<
  InsertDocumento,
  "legacyId" | "createdAt" | "updatedAt" | "expiryDate" | "alertStatus"
>;

export interface LogDocument {
  userId: number;
  action: string;
  documentId: number | null;
  details: any;
  timestamp: Date | null;
  legacyId: number;
}

export type InsertLog = Omit<LogDocument, "legacyId" | "timestamp">;
export type InsertUser = Omit<UserDocument, "legacyId" | "createdAt">;
