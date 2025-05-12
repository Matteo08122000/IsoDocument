export interface ClientDocument {
  id: number;
  name: string;
  driveFolderId: string;
  createdAt: Date;
  updatedAt: Date;
  legacyId: number;

  google?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
  };
}

export type InsertClient = Omit<
  ClientDocument,
  "legacyId" | "createdAt" | "updatedAt"
>;
