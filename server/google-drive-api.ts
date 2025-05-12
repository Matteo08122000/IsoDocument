export async function googleDriveListFiles(
  drive: drive_v3.Drive,
  folderId: string
): Promise<drive_v3.Schema$File[]> {
  console.log(`🔍 Ricerca file in Drive - Folder ID: ${folderId}`);
  console.log("🔑 Query:", `'${folderId}' in parents and trashed = false`);

  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined = undefined;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`📄 Pagina ${pageCount}...`);
    
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, webViewLink, mimeType)",
      spaces: "drive",
      pageSize: 1000,
      pageToken,
    });

    console.log("📊 Risposta Drive:", {
      nextPageToken: res.data.nextPageToken ? "presente" : "assente",
      filesCount: res.data.files?.length || 0
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
  console.log("📋 Dettaglio file:", files.map(f => ({
    name: f.name,
    id: f.id,
    mimeType: f.mimeType
  })));
  
  return files;
} 