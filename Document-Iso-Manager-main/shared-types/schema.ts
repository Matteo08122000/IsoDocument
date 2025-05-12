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
export type InsertUser = Omit<UserDocument, "legacyId" | "createdAt">;

export interface LogDocument {
  userId: number;
  action: string;
  documentId: number | null;
  details: any;
  timestamp: Date | null;
  legacyId: number;
}
export type InsertLog = Omit<LogDocument, "legacyId" | "timestamp">;

export interface DocumentDocument {
  title: string;
  path: string;
  revision: string;
  driveUrl: string;
  fileType: string;
  alertStatus: string | null;
  parentId: number | null;
  isObsolete: boolean | null;
  fileHash: string | null;
  encryptedCachePath: string | null;
  ownerId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  legacyId: number;
}
export type InsertDocument = Omit<
  DocumentDocument,
  "legacyId" | "createdAt" | "updatedAt"
>;
