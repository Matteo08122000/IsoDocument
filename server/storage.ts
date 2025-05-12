  async createUser(insertUser: InsertUser): Promise<User> {
    const legacyId = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = {
      ...insertUser,
      legacyId,
      createdAt: createdAt || null,
      role: insertUser.role || "user",
      clientId: insertUser.clientId || null,
      lastLogin: insertUser.lastLogin || null,
      sessionExpiry: insertUser.sessionExpiry || null,
    };
    this.users.set(legacyId, user);
    return user;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const legacyId = this.documentIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const document: Document = {
      ...insertDocument,
      legacyId,
      createdAt: createdAt || null,
      updatedAt: updatedAt || null,
      alertStatus: insertDocument.alertStatus || null,
      parentId: insertDocument.parentId || null,
      isObsolete: insertDocument.isObsolete || null,
      fileHash: insertDocument.fileHash || null,
      encryptedCachePath: insertDocument.encryptedCachePath || null,
    };
    this.documents.set(legacyId, document);
    return document;
  }

  async createLog(insertLog: Omit<InsertLog, "documentId"> & { documentId?: number }): Promise<Log> {
    const legacyId = this.logIdCounter++;
    const timestamp = new Date();
    const log: Log = {
      ...insertLog,
      legacyId,
      documentId: insertLog.documentId || null,
      timestamp: timestamp || null,
      details: insertLog.details || {},
    };
    this.logs.set(legacyId, log);
    return log;
  } 