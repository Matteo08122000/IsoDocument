import { z } from "zod";

export const insertDocumentSchema = z.object({
  title: z.string(),
  path: z.string(),
  revision: z.string(),
  driveUrl: z.string().url(),
  fileType: z.string(),
  alertStatus: z.string().nullable(),
  parentId: z.number().nullable(),
  isObsolete: z.boolean().nullable(),
  fileHash: z.string().nullable(),
  encryptedCachePath: z.string().nullable(),
  expiryDate: z.date().nullable(),
  warningDays: z.number().optional(),
  clientId: z.number().nullable().optional(),
  ownerId: z.number().nullable().optional(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(["admin", "viewer"]),
  clientId: z.number().nullable(),
  lastLogin: z.date().nullable(),
  sessionExpiry: z.date().nullable(),
});

export const insertLogSchema = z.object({
  userId: z.number(),
  action: z.string(),
  documentId: z.number().nullable().optional(),
  details: z.any(),
});

export const insertClientSchema = z.object({
  name: z.string(),
  driveFolderId: z.string(),
});

export const verifyCompanyCodeSchema = z.object({
  code: z.string(),
});
