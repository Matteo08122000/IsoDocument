// ✅ Rimozione completa del Service Account e sostituzione con OAuth2 client-based

import {
  DocumentDocument as Document,
  InsertDocument,
} from "../shared-types/schema";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
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
  /^(\d+(?:\.\d+)*)_([\p{L}\p{N} .,'’()-]+?)_Rev\.(\d+)_([0-9]{4}-[0-9]{2}-[0-9]{2})\.(\w+)$/u;

export function parseISOPath(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[1] : null;
}

export function parseTitle(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[2].trim() : null;
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

type Alert = "none" | "warning" | "expired";
interface ExcelAnalysis {
  alertStatus: Alert;
  expiryDate: Date | null;
}

// ✅ FUNZIONE AGGIORNATA: Analizza il contenuto Excel per estrarre data di scadenza e status
export async function analyzeExcelContent(
  filePath: string
): Promise<ExcelAnalysis> {
  // accettiamo solo .xlsx
  if (!filePath.toLowerCase().endsWith(".xlsx")) {
    return { alertStatus: "none", expiryDate: null };
  }

  // 1️⃣ carica il workbook chiedendo Date reali
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { alertStatus: "none", expiryDate: null };

  // celle da scandagliare
  const cellsToCheck = ["A1", "B1", "C1", "A2", "B2", "C2"];

  let expiryDate: Date | null = null;
  let alertStatus: Alert = "none";

  // 2️⃣ cerca la data
  for (const ref of cellsToCheck) {
    const cell = sheet[ref];
    if (!cell || cell.v == null) continue;

    // a) cella già di tipo data
    if (cell.t === "d" && cell.v instanceof Date) {
      expiryDate = cell.v as Date;
      break;
    }

    // b) seriale Excel (numero)
    if (cell.t === "n") {
      const serial = cell.v as number;
      const { y, m, d } = XLSX.SSF.parse_date_code(serial);
      if (y && m && d) {
        expiryDate = new Date(Date.UTC(y, m - 1, d));
        break;
      }
    }

    // c) stringa "24/05/2025" o "24-05-2025"
    const str = String(cell.v).trim();
    const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
      const [, dd, mm, yyyy] = m.map(Number);
      expiryDate = new Date(Date.UTC(yyyy, mm - 1, dd));
      break;
    }
  }

  // 3️⃣ se abbiamo la data, calcoliamo lo stato
  if (expiryDate) {
    const diffDays = Math.floor(
      (expiryDate.getTime() - Date.now()) / 86_400_000
    );

    if (diffDays < 0) alertStatus = "expired";
    else if (diffDays <= 30) alertStatus = "warning";
  }

  // 4️⃣ override via emoji - se presenti
  for (const ref of cellsToCheck) {
    const cell = sheet[ref];
    if (!cell || cell.v == null) continue;

    const txt = String(cell.v);
    if (txt.includes("🔴")) {
      alertStatus = "expired";
      break;
    }
    if (txt.includes("⚠️")) {
      alertStatus = "warning";
      break;
    }
  }

  return { alertStatus, expiryDate };
}
// ✅ FUNZIONE DEPRECATA: Manteniamo per compatibilità ma ora usa analyzeExcelContent
export async function checkExcelAlertStatus(filePath: string): Promise<string> {
  const result = await analyzeExcelContent(filePath);
  return result.alertStatus;
}

// ✅ FUNZIONE AGGIORNATA: Ora analizza anche il contenuto Excel
export async function processDocumentFile(
  fileName: string,
  driveUrl: string,
  localFilePath?: string
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

    // ✅ NUOVO: Analizza contenuto Excel se disponibile
    let alertStatus = "none";
    let expiryDate: Date | null = null;

    if (localFilePath && fileType === "xlsx") {
      console.log(`🔍 Analizzando contenuto Excel: ${localFilePath}`);
      const excelAnalysis = await analyzeExcelContent(localFilePath);
      alertStatus = excelAnalysis.alertStatus;
      expiryDate = excelAnalysis.expiryDate;
    }

    const document: InsertDocument = {
      title,
      path: isoPath,
      revision,
      driveUrl,
      fileType,
      alertStatus,
      expiryDate,
      isObsolete: false,
      parentId: null, // or some other default value
      fileHash: null, // or some other default value
      encryptedCachePath: null, // or some other default value
      ownerId: null, // or some other default value
      clientId: null, // or some other default value
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
    await mongoStorage.markDocumentObsolete(doc.legacyId);
    await mongoStorage.createLog({
      userId,
      action: "revision",
      documentId: doc.legacyId,
      details: { message: `Obsoleto: ${doc.title} ${doc.revision}` },
    });
  }
}

/**
 * Sincronizza una cartella Google Drive (e tutte le sue sottocartelle) con il DB.
 * - Elenca ricorsivamente ogni file (no cartelle)
 * - Scarica il file in /tmp
 * - Esegue `processDocumentFile` che valida nome + metadata
 * - Crea il documento se non esiste, marca le revisioni obsolete
 */
export async function syncWithGoogleDrive(
  syncFolder: string,
  userId: number
): Promise<void> {
  try {
    /* ────────────────────────────────────────────────────
     * 1. Dati utente / client
     * ──────────────────────────────────────────────────── */
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

    /* ────────────────────────────────────────────────────
     * 2. Client Google Drive
     * ──────────────────────────────────────────────────── */
    const drive = await getDriveClientForClient(clientId);

    /* ────────────────────────────────────────────────────
     * 3. Listing ricorsivo (no cartelle nella lista)
     * ──────────────────────────────────────────────────── */
    const files = await googleDriveListFiles(drive, folderId);
    console.log(`📄 File trovati in Drive (ricorsivo): ${files.length}`);

    /* ────────────────────────────────────────────────────
     * 4. Loop seriale (puoi parallelizzare con p-limit se servono performance)
     * ──────────────────────────────────────────────────── */
    for (const file of files) {
      console.log(`🔄 Processando file: ${file.name}`);
      const tmpPath = path.join(os.tmpdir(), `${uuidv4()}-${file.name}`);

      try {
        /* 4.1 Download */
        await googleDriveDownloadFile(drive, file.id!, tmpPath);
        console.log(`✅ File scaricato: ${file.name}`);

        /* 4.2 Parsing + metadata check
         *    processDocumentFile ora accetta (fileName, driveUrl, tmpPath)       */
        const doc = await processDocumentFile(
          file.name!,
          file.webViewLink!,
          tmpPath
        );

        if (!doc) {
          console.log(
            `⚠️ File non valido o non conforme al pattern: ${file.name}`
          );
          continue;
        }

        /* 4.3 De-dup / insert */
        const exists = await mongoStorage.getDocumentByPathAndTitleAndRevision(
          doc.path,
          doc.title,
          doc.revision
        );
        if (exists) {
          console.log(
            `ℹ️ Documento già presente: ${doc.title} ${doc.revision}`
          );
          continue;
        }

        const created = await mongoStorage.createDocument({
          ...doc,
          clientId,
          ownerId: userId,
        });

        /* 4.4 Obsolete revisions */
        const obsolete = await findObsoleteRevisions(
          doc.path,
          doc.title,
          doc.revision
        );
        await markObsoleteDocuments(obsolete, userId);

        console.log(
          `✅ Documento sincronizzato: ${created.title} (scadenza: ${
            doc.expiryDate?.toISOString() || "N/A"
          }, status: ${doc.alertStatus})`
        );
      } catch (fileError) {
        console.error(`❌ Errore processando file ${file.name}:`, fileError);
      } finally {
        /* 4.5 Cleanup /tmp (sempre, anche in caso di errore) */
        fs.promises.unlink(tmpPath).catch(() => {});
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
  }, 30 * 1000);
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
        continue;
      }

      const userId = admin.legacyId;

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
