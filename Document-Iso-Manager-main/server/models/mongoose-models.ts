import mongoose, { Schema, Document } from "mongoose";

// User Schema
export interface UserDocument extends mongoose.Document {
  id: number;
  email: string;
  password: string;
  role: string;
  clientId: number; // ID del client a cui l'utente appartiene
  lastLogin: Date | null;
  sessionExpiry: Date | null;
  createdAt: Date | null;
  legacyId: number;
}

const userSchema = new Schema<UserDocument>({
  id: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: "viewer" },
  clientId: { type: Number, default: null },
  lastLogin: { type: Date, default: null },
  sessionExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  legacyId: { type: Number, unique: true }, // Campo ID numerico per compatibilità con API
});

// Document Schema
export interface DocumentDocument extends mongoose.Document {
  id: number;
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

const documentSchema = new Schema<DocumentDocument>({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  path: { type: String, required: true },
  revision: { type: String, required: true },
  driveUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  alertStatus: { type: String, default: "none" },
  parentId: { type: Number, default: null },
  isObsolete: { type: Boolean, default: false },
  fileHash: { type: String, default: null },
  encryptedCachePath: { type: String, default: null },
  ownerId: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  legacyId: { type: Number, unique: true },
});

// Log Schema
export interface LogDocument extends mongoose.Document {
  id: number;
  userId: number;
  action: string;
  documentId: number | null;
  details: any;
  timestamp: Date | null;
  legacyId: number;
}

const logSchema = new Schema<LogDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  action: { type: String, required: true },
  documentId: { type: Number, default: null },
  details: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now },
  legacyId: { type: Number, unique: true },
});

// Counter Schema for auto-incrementing IDs
interface CounterDocument extends mongoose.Document {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model<CounterDocument>("Counter", counterSchema);

// Function to get the next sequence value
export async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Client Schema
export interface ClientDocument {
  id: number;
  name: string;
  driveFolderId: string;
  createdAt: Date;
  updatedAt: Date;
  legacyId: number;

  // ❌ questi erano i vecchi campi, li puoi rimuovere
  // driveAccessToken: string | null;
  // driveRefreshToken: string | null;

  // ✅ questo è il nuovo oggetto usato in mongoStorage.updateClientTokens
  google?: {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
  };
}

const clientSchema = new mongoose.Schema({
  legacyId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  driveFolderId: { type: String, required: true },
  google: {
    accessToken: { type: String, required: false },
    refreshToken: { type: String, required: false },
    expiryDate: { type: Number, required: false },
  },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

// Company Code Schema
export interface CompanyCodeDocument extends mongoose.Document {
  id: number;
  code: string;
  role: string;
  usageLimit: number;
  usageCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  legacyId: number;
}

const companyCodeSchema = new Schema<CompanyCodeDocument>({
  id: { type: Number, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  role: { type: String, required: true, default: "admin" },
  usageLimit: { type: Number, default: 1 },
  usageCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  legacyId: { type: Number, unique: true },
});

// Create models
export const UserModel = mongoose.model<UserDocument>("User", userSchema);
export const DocumentModel = mongoose.model<DocumentDocument>(
  "Document",
  documentSchema
);
export const LogModel = mongoose.model<LogDocument>("Log", logSchema);
export const ClientModel = mongoose.model<ClientDocument>(
  "Client",
  clientSchema
);
export const CompanyCodeModel = mongoose.model<CompanyCodeDocument>(
  "CompanyCode",
  companyCodeSchema
);
