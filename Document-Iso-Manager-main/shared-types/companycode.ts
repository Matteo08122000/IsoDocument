export interface CompanyCodeDocument {
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
export type InsertCompanyCode = Omit<
  CompanyCodeDocument,
  "legacyId" | "usageCount" | "createdAt" | "updatedAt"
>;
