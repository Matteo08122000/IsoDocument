// ✅ Rimozione completa del Service Account e sostituzione con OAuth2 client-based

import {
  DocumentDocument as Document,
  InsertDocument,
} from "../shared-types/schema";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { mongoStorage } from "../server/mongo-storage";
import {
  googleDriveListFiles,
  googleDriveDownloadFile,
} from "./google-drive-api";

import { getDriveClientForClient } from "./google-oauth";

const syncIntervals: Record<number, NodeJS.Timeout> = {};

export function extractFolderIdFromUrl(input: string): string | null {
  if (!input || input.trim() === "") return null;

  const patterns = [
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:[\?#][^\s]*)?/, // folders
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?my-drive\/([a-zA-Z0-9_-]+)(?:[\?#][^\s]*)?/, // my-drive
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(?:&[^\s]*)?/, // open?id=
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) return match[1];
  }

  if (/^[a-zA-Z0-9_-]+$/.test(input)) return input;

  return null;
}

const fileNamePattern =
  /^(\d+(?:\.\d+)*)[_-](.+?)[_-]Rev\.(\d+)[_-](\d{4}-\d{2}-\d{2})\.(.+)$/u;

export function parseISOPath(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[1] : null;
}

export function parseTitle(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[2].replace(/-/g, " ").trim() : null;
}

export function parseRevision(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? `Rev.${match[3]}` : null;
}

export function parseDate(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[4] : null;
}

export function parseFileType(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[5].toLowerCase() : null;
}

export async function checkExcelAlertStatus(filePath: string): Promise<string> {
  try {
    if (!filePath.toLowerCase().endsWith(".xlsx")) return "none";
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const cellA1 = sheet["A1"];
    if (!cellA1 || !cellA1.v) return "none";
    const value = String(cellA1.v).trim();
    if (value.includes("🔴")) return "expired";
    if (value.includes("⚠️")) return "warning";
    const dateMatch = value.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (dateMatch) {
      const [_, dd, mm, yyyy] = dateMatch;
      const expiryDate = new Date(`${yyyy}-${mm}-${dd}`);
      const today = new Date();
      if (expiryDate < today) return "expired";
      const daysLeft = Math.floor(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= 30) return "warning";
      return "none";
    }
    return "none";
  } catch (error) {
    console.error(`Errore checkExcelAlertStatus: ${error}`);
    return "none";
  }
}

export async function processDocumentFile(
  fileName: string,
  driveUrl: string
): Promise<InsertDocument | null> {
  try {
    console.log(`📂 Analisi file: ${fileName}`);

    const isoPath = parseISOPath(fileName);
    const title = parseTitle(fileName);
    const revision = parseRevision(fileName);
    const fileType = parseFileType(fileName);

    console.log(
      `🔍 Parsed -> path: ${isoPath}, title: ${title}, rev: ${revision}, type: ${fileType}`
    );

    if (!isoPath) {
      console.warn(
        `⚠️ Nome file non contiene un percorso ISO valido: ${fileName}`
      );
      return null;
    }

    if (!title) {
      console.warn(`⚠️ Nome file non contiene un titolo valido: ${fileName}`);
      return null;
    }

    if (!revision) {
      console.warn(
        `⚠️ Nome file non contiene una revisione valida: ${fileName}`
      );
      return null;
    }

    if (!fileType) {
      console.warn(
        `⚠️ Nome file non contiene un tipo di file valido: ${fileName}`
      );
      return null;
    }

    const document: InsertDocument = {
      title,
      path: isoPath,
      revision,
      driveUrl,
      fileType,
      alertStatus: "none",
      isObsolete: false,
    };

    console.log(`✅ Documento valido generato:`, document);
    return document;
  } catch (error) {
    console.error(
      `❌ Errore in processDocumentFile per file ${fileName}:`,
      error
    );
    return null;
  }
}

export async function findObsoleteRevisions(
  documentPath: string,
  documentTitle: string,
  currentRevision: string
): Promise<Document[]> {
  const currentRevNum = parseInt(currentRevision.replace("Rev.", ""), 10);
  const documents = await mongoStorage.getDocumentsByPathAndTitle(
    documentPath,
    documentTitle
  );
  return documents.filter((doc) => {
    const docRevNum = parseInt(doc.revision.replace("Rev.", ""), 10);
    return docRevNum < currentRevNum;
  });
}

export async function markObsoleteDocuments(
  documents: Document[],
  userId: number
): Promise<void> {
  for (const doc of documents) {
    await mongoStorage.markDocumentObsolete(doc.id);
    await mongoStorage.createLog({
      userId,
      action: "revision",
      documentId: doc.id,
      details: { message: `Obsoleto: ${doc.title} ${doc.revision}` },
    });
  }
}

export async function syncWithGoogleDrive(
  syncFolder: string,
  userId: number
): Promise<void> {
  try {
    const user = await mongoStorage.getUser(userId);
    const clientId = user?.clientId;

    if (!clientId) {
      console.error("❌ Client ID non trovato per l'utente");
      return;
    }

    const folderId =
      (await mongoStorage.getFolderIdForUser(userId)) || syncFolder;

    console.log(`📁 Sync da ${folderId} per utente ${userId}`);
    console.log(`🔑 Client ID: ${clientId}`);

    // ✅ Ottieni il client Google Drive autenticato via OAuth2
    const drive = await getDriveClientForClient(clientId);

    const files = await googleDriveListFiles(drive, folderId);
    console.log(`📄 File trovati in Drive: ${files.length}`);

    for (const file of files) {
      console.log(`🔄 Processando file: ${file.name}`);
      const tmpPath = path.join(os.tmpdir(), `${uuidv4()}-${file.name}`);

      try {
        await googleDriveDownloadFile(drive, file.id!, tmpPath);
        console.log(`✅ File scaricato: ${file.name}`);

        const doc = await processDocumentFile(file.name!, file.webViewLink!);
        fs.unlinkSync(tmpPath);

        if (!doc) {
          console.log(
            `⚠️ File non valido o non conforme al pattern: ${file.name}`
          );
          continue;
        }

        const existing =
          await mongoStorage.getDocumentByPathAndTitleAndRevision(
            doc.path,
            doc.title,
            doc.revision
          );

        if (existing) {
          console.log(
            `ℹ️ Documento già esistente: ${doc.title} ${doc.revision}`
          );
          continue;
        }

        const created = await mongoStorage.createDocument({
          ...doc,
          clientId,
          ownerId: userId,
        });

        const obsolete = await findObsoleteRevisions(
          doc.path,
          doc.title,
          doc.revision
        );
        await markObsoleteDocuments(obsolete, userId);

        console.log(`✅ Documento sincronizzato: ${created.title}`);
      } catch (fileError) {
        console.error(`❌ Errore processando file ${file.name}:`, fileError);
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      }
    }

    console.log("✅ Sync completata");
  } catch (err) {
    console.error("❌ Errore sync:", err);
  }
}

export function startAutomaticSync(syncFolder: string, userId: number): void {
  stopAutomaticSync(userId);
  const intervalId = setInterval(() => {
    syncWithGoogleDrive(syncFolder, userId);
  }, 15 * 60 * 1000);
  syncIntervals[userId] = intervalId;
  syncWithGoogleDrive(syncFolder, userId);
  console.log(`🔄 Sync automatica attiva per user ${userId}`);
}

export function stopAutomaticSync(userId: number): void {
  const interval = syncIntervals[userId];
  if (interval) {
    clearInterval(interval);
    delete syncIntervals[userId];
    console.log(`🛑 Sync fermata per user ${userId}`);
  }
}

export function startAutomaticSyncForAllClients(): void {
  syncAllClientsOnce();
  setInterval(syncAllClientsOnce, 15 * 60 * 1000);
}

async function syncAllClientsOnce(): Promise<void> {
  try {
    const clients = await mongoStorage.getAllClients();
    const users = await mongoStorage.getAllUsers();

    for (const client of clients) {
      const admin = users.find(
        (u) => u.clientId === client.id && u.role === "admin"
      );

      if (!admin) {
        console.warn(
          `⚠️ Nessun utente admin trovato per il client "${client.name}" (id=${client.id})`
        );
        continue; // salta alla prossima iterazione
      }

      const userId = admin.id;

      try {
        console.log(
          `🚀 Sync avviata per client "${client.name}" (userId=${userId})`
        );
        await syncWithGoogleDrive(client.driveFolderId, userId);
        console.log(`✅ Sync completata per client "${client.name}"`);
      } catch (syncError) {
        console.error(
          `❌ Errore durante la sync del client "${client.name}" (userId=${userId}):`,
          syncError
        );
      }
    }

    console.log("✅ Tutti i client sincronizzati");
  } catch (err) {
    console.error("❌ Errore generale durante la sync multipla:", err);
  }
}
