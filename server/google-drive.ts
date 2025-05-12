export async function syncWithGoogleDrive(
  syncFolder: string,
  userId: number
): Promise<void> {
  try {
    console.log("🚀 Inizio sync con Google Drive");
    console.log("📌 Parametri:", { syncFolder, userId });

    const user = await mongoStorage.getUser(userId);
    console.log("👤 Utente trovato:", user);

    const clientId = user?.clientId;
    if (!clientId) {
      console.error("❌ Client ID non trovato per l'utente");
      return;
    }

    const folderId = (await mongoStorage.getFolderIdForUser(userId)) || syncFolder;
    console.log("📁 Folder ID:", folderId);

    // ✅ Ottieni il client Google Drive autenticato via OAuth2
    console.log("🔑 Tentativo di ottenere client Drive...");
    const drive = await getDriveClientForClient(clientId);
    console.log("✅ Client Drive ottenuto con successo");

    console.log("🔍 Ricerca file in Drive...");
    const files = await googleDriveListFiles(drive, folderId);
    console.log(`📄 File trovati in Drive: ${files.length}`);
    console.log("📋 Lista file:", files.map(f => ({ name: f.name, id: f.id })));

    for (const file of files) {
      console.log(`\n🔄 Processando file: ${file.name}`);
      const tmpPath = path.join(os.tmpdir(), `${uuidv4()}-${file.name}`);

      try {
        await googleDriveDownloadFile(drive, file.id!, tmpPath);
        console.log(`✅ File scaricato: ${file.name}`);

        const doc = await processDocumentFile(file.name!, file.webViewLink!);
        console.log("📝 Documento processato:", doc);
        fs.unlinkSync(tmpPath);

        if (!doc) {
          console.log(`⚠️ File non valido o non conforme al pattern: ${file.name}`);
          continue;
        }

        const existing = await mongoStorage.getDocumentByPathAndTitleAndRevision(
          doc.path,
          doc.title,
          doc.revision
        );

        if (existing) {
          console.log(`ℹ️ Documento già esistente: ${doc.title} ${doc.revision}`);
          continue;
        }

        const created = await mongoStorage.createDocument({
          ...doc,
          clientId,
          ownerId: userId,
        });

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