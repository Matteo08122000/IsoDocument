import nodemailer from "nodemailer";
import { DocumentDocument as Document } from "../shared-types/schema";
import { storage } from "./storage";
import { mongoStorage } from "./mongo-storage";
import { addDays, format, isAfter, isBefore, parseISO } from "date-fns";

// Configurazione del transporter nodemailer
// Utilizziamo le stesse credenziali SMTP configurate nelle variabili d'ambiente

// Configurazione identica a quella in mailer.ts per coerenza
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true per 465, false per altri
  auth: {
    user: process.env.SMTP_USER || "user@example.com",
    pass: process.env.SMTP_PASSWORD || "password",
  },
});

// Configurazione di base per i preavvisi (in giorni)
const DEFAULT_WARNING_DAYS = 30; // Preavviso standard di 30 giorni

/**
 * Verifica i documenti con date di scadenza imminenti e invia notifiche
 * @param warningDays Giorni di preavviso prima della scadenza
 */
export async function checkDocumentExpirations(
  warningDays: number = DEFAULT_WARNING_DAYS
): Promise<void> {
  try {
    console.log(
      `Verifico documenti in scadenza (preavviso: ${warningDays} giorni)...`
    );

    // Ottieni tutti i documenti attivi (non obsoleti)
    const allDocuments = await storage.getAllDocuments();
    const activeDocuments = allDocuments.filter((doc) => !doc.isObsolete);

    // Data corrente
    const today = new Date();

    // Data limite per i warning (oggi + giorni di preavviso)
    const warningLimit = addDays(today, warningDays);

    const expiredDocuments: Document[] = [];
    const warningDocuments: Document[] = [];

    // Controlla ogni documento per scadenze
    for (const doc of activeDocuments) {
      // Se il documento ha una data di scadenza
      if (doc.expiryDate) {
        const expiryDate =
          typeof doc.expiryDate === "string"
            ? parseISO(doc.expiryDate)
            : doc.expiryDate;

        // Documento già scaduto
        if (isBefore(expiryDate, today)) {
          expiredDocuments.push(doc);
        }
        // Documento in scadenza entro i giorni di preavviso
        else if (isBefore(expiryDate, warningLimit)) {
          warningDocuments.push(doc);
        }
      }
    }

    // Invia notifiche per documenti scaduti
    if (expiredDocuments.length > 0) {
      await sendExpirationNotifications(expiredDocuments, "expired");
    }

    // Invia notifiche per documenti in scadenza
    if (warningDocuments.length > 0) {
      await sendExpirationNotifications(warningDocuments, "warning");
    }

    console.log(
      `Controllo completato: ${expiredDocuments.length} documenti scaduti, ${warningDocuments.length} in scadenza`
    );
  } catch (error) {
    console.error("Errore durante il controllo delle scadenze:", error);
  }
}

/**
 * Invia notifiche email per documenti in scadenza o scaduti
 * @param documents Lista dei documenti
 * @param type Tipo di notifica ('expired' o 'warning')
 */
async function sendExpirationNotifications(
  documents: Document[],
  type: "expired" | "warning"
): Promise<void> {
  try {
    // Ottieni tutti gli utenti amministratori
    const allUsers = await storage.getAllUsers();
    const admins = allUsers.filter((user) => user.role === "admin");

    if (admins.length === 0) {
      console.log("Nessun amministratore trovato per inviare notifiche");
      return;
    }

    // Raggruppa documenti per client per una migliore organizzazione
    const documentsByClient: { [clientId: string]: Document[] } = {};

    for (const doc of documents) {
      // Determina il clientId associato al documento (se esiste)
      // In un sistema reale, potremmo avere un campo clientId sul documento
      // Per ora, possiamo usare un valore predefinito
      const clientId = doc.clientId || "default";

      if (!documentsByClient[clientId]) {
        documentsByClient[clientId] = [];
      }

      documentsByClient[clientId].push(doc);
    }

    // Invia email per ogni gruppo di client
    for (const [clientId, clientDocs] of Object.entries(documentsByClient)) {
      // Trova gli admin associati a questo client (o tutti gli admin se non c'è associazione)
      const targetAdmins = allUsers.filter(
        (user) =>
          user.role === "admin" &&
          (user.clientId === parseInt(clientId) ||
            clientId === "default" ||
            !user.clientId)
      );

      if (targetAdmins.length === 0) continue;

      // Crea la lista di documenti in HTML
      let docsListHTML = "";
      clientDocs.forEach((doc) => {
        const expiryDate = doc.expiryDate
          ? format(
              new Date(
                doc.expiryDate instanceof Date
                  ? doc.expiryDate.toISOString()
                  : (doc.expiryDate as string)
              ),
              "dd/MM/yyyy"
            )
          : "N/A";

        docsListHTML += `
          <tr>
            <td>${doc.title}</td>
            <td>${doc.path}</td>
            <td>${doc.revision}</td>
            <td>${expiryDate}</td>
          </tr>
        `;
      });

      // Determina oggetto e testo in base al tipo di notifica
      const isExpired = type === "expired";
      const subject = isExpired
        ? `URGENTE: ${clientDocs.length} documenti scaduti`
        : `Preavviso: ${clientDocs.length} documenti in scadenza`;

      const intro = isExpired
        ? `I seguenti documenti sono <strong>scaduti</strong> e richiedono attenzione immediata:`
        : `I seguenti documenti stanno per scadere nei prossimi ${DEFAULT_WARNING_DAYS} giorni:`;

      // Costruisci l'email HTML
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${isExpired ? "#d63031" : "#e17055"};">${
        isExpired ? "Documenti Scaduti" : "Documenti in Scadenza"
      }</h2>
          <p>${intro}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f1f1f1;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Documento</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Percorso ISO</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Revisione</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              ${docsListHTML}
            </tbody>
          </table>
          
          <p style="margin-top: 20px;">
            Accedi al <a href="${
              process.env.APP_URL || "http://localhost:5000"
            }">Sistema di Gestione Documenti ISO</a> per gestire questi documenti.
          </p>
          
          <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Questo è un messaggio automatico inviato dal sistema di Gestione Documenti ISO.<br>
            Non rispondere a questa email.
          </p>
        </div>
      `;

      // Invia email a tutti gli admin target
      for (const admin of targetAdmins) {
        await transporter.sendMail({
          from: `"ISO Document Manager" <${
            process.env.SMTP_USER || "noreply@isodocmanager.it"
          }>`,
          to: admin.email,
          subject,
          html: emailHTML,
        });

        console.log(`Notifica di scadenza inviata a ${admin.email}`);
      }
    }
  } catch (error) {
    console.error("Errore durante l'invio delle notifiche di scadenza:", error);
  }
}

// Variabile per tenere traccia dell'intervallo di controllo
let expirationCheckInterval: NodeJS.Timeout | null = null;

/**
 * Avvia il controllo periodico delle scadenze documentali
 * @param checkIntervalHours Intervallo in ore tra i controlli
 * @param warningDays Giorni di preavviso per le scadenze
 */
export function startExpirationChecks(
  checkIntervalHours: number = 24,
  warningDays: number = DEFAULT_WARNING_DAYS
): void {
  // Assicurati che non ci siano altri intervalli attivi
  stopExpirationChecks();

  // Esegui un controllo iniziale
  checkDocumentExpirations(warningDays);

  // Imposta l'intervallo (default: ogni 24 ore)
  const intervalMs = checkIntervalHours * 60 * 60 * 1000;

  expirationCheckInterval = setInterval(() => {
    checkDocumentExpirations(warningDays);
  }, intervalMs);

  console.log(
    `Controllo automatico scadenze avviato: ogni ${checkIntervalHours} ore con preavviso di ${warningDays} giorni`
  );
}

/**
 * Interrompe il controllo periodico delle scadenze
 */
export function stopExpirationChecks(): void {
  if (expirationCheckInterval) {
    clearInterval(expirationCheckInterval);
    expirationCheckInterval = null;
    console.log("Controllo automatico scadenze interrotto");
  }
}

/**
 * Personalizza i giorni di preavviso per un documento specifico
 * @param documentId ID del documento
 * @param warningDays Giorni di preavviso personalizzati
 */
export async function setCustomWarningDays(
  documentId: number,
  warningDays: number
): Promise<boolean> {
  try {
    const document = await storage.getDocument(documentId);
    if (!document) return false;

    // Aggiorna il documento con i giorni di preavviso personalizzati
    await storage.updateDocument(documentId, {
      warningDays: warningDays,
    });

    return true;
  } catch (error) {
    console.error(
      `Errore nell'impostazione dei giorni di preavviso per il documento ${documentId}:`,
      error
    );
    return false;
  }
}
