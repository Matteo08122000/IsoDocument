import { google, drive_v3 } from "googleapis";
import fs from "fs";
import { pipeline } from "stream/promises";
import { getDriveClientForClient } from "./google-oauth";

export async function googleDriveDownloadFile(
  drive: drive_v3.Drive,
  fileId: string,
  destPath: string
): Promise<void> {
  const metadata = await drive.files.get({
    fileId,
    fields: "mimeType, name",
  });

  const mimeType = metadata.data.mimeType;
  const name = metadata.data.name;

  console.log(`📄 ${name} (${fileId}) - MIME: ${mimeType}`);

  if (!mimeType) {
    throw new Error("Impossibile determinare il mimeType del file");
  }

  let streamRes;

  if (mimeType.startsWith("application/vnd.google-apps")) {
    let exportMime: string;

    switch (mimeType) {
      case "application/vnd.google-apps.spreadsheet":
        exportMime =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "application/vnd.google-apps.document":
        exportMime =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "application/vnd.google-apps.presentation":
        exportMime =
          "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        break;
      default:
        throw new Error(`❌ Tipo Google non supportato: ${mimeType}`);
    }

    streamRes = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "stream" }
    );
  } else {
    streamRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );
  }

  const dest = fs.createWriteStream(destPath);
  await pipeline(streamRes.data, dest);
}

/**
 * Elenca tutti i file in una cartella di Google Drive (OAuth2)
 * Supporta paginazione e ritorna tutti i file presenti
 */
export async function googleDriveListFiles(
  drive: drive_v3.Drive,
  folderId: string
): Promise<drive_v3.Schema$File[]> {
  console.log(`🔍 Ricerca file in Drive - Folder ID: ${folderId}`);

  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, webViewLink, mimeType)",
      spaces: "drive",
      pageSize: 1000,
      pageToken,
    });

    if (res.data.files) {
      files.push(...res.data.files);
      console.log(
        `📦 ${res.data.files.length} file aggiunti. Totale: ${files.length}`
      );
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  console.log(`✅ Ricerca completata. Totale file trovati: ${files.length}`);
  return files;
}
