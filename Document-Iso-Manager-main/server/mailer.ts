import nodemailer from "nodemailer";
import { Request, Response } from "express";
import { generateSecureLink } from "./secure-links";
import { mongoStorage as storage } from "./mongo-storage";

// Creiamo un transporter riutilizzabile che utilizzerà SMTP
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true per 465, false per altri
  auth: {
    user: process.env.SMTP_USER || "user@example.com",
    pass: process.env.SMTP_PASSWORD || "password",
  },
});

// Definizione base URL per i link nell'applicazione
const APP_URL =
  process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;

/**
 * Invia un'email di recupero password all'utente
 * @param req Request con l'email dell'utente
 * @param res Response
 */
export async function handlePasswordReset(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email obbligatoria" });
  }

  try {
    // Verifica se l'utente esiste
    const user = await storage.getUserByEmail(email);

    if (!user) {
      // Per sicurezza, non rivelare se l'email esiste o meno
      return res.status(200).json({
        success: true,
        message:
          "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
      });
    }

    // Genera un link sicuro per il reset della password (valido per 1 ora)
    const resetLink = generateSecureLink(
      null,
      user.legacyId,
      "reset-password",
      60 * 60 * 1000
    );
    const resetUrl = `${APP_URL}/reset-password${resetLink}`;

    // Log dell'azione
    await storage.createLog({
      userId: user.legacyId,
      action: "password-reset-request",
      details: {
        email: user.email,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || "unknown",
      },
    });

    try {
      // Prepara l'email di recupero password
      console.log("Invio email di reset password a:", user.email);

      // Crea il template HTML dell'email
      const emailHTML = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Recupero Password</h2>
        <p>Hai richiesto il recupero della password per il tuo account ISO Document Manager.</p>
        <p>Clicca sul pulsante qui sotto per reimpostare la tua password:</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reimposta Password</a>
        </p>
        <p><strong>Nota:</strong> Questo link sarà valido per 1 ora.</p>
        <p>Se non hai richiesto il recupero della password, ignora questa email.</p>
        <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Questo è un messaggio automatico, si prega di non rispondere.</p>
      </div>`;

      // Invia l'email usando nodemailer
      const info = await transporter.sendMail({
        from: `"ISO Document Manager" <${
          process.env.SMTP_USER || "noreply@isodocmanager.it"
        }>`,
        to: user.email,
        subject: "Recupero password - ISO Document Manager",
        text: `Hai richiesto il recupero della password. Clicca sul seguente link per reimpostare la tua password: ${resetUrl}\n\nQuesto link sarà valido per 1 ora.\n\nSe non hai richiesto il recupero della password, ignora questa email.`,
        html: emailHTML,
      });

      console.log("Email inviata, ID:", info.messageId || "N/A");

      // In ambiente di sviluppo, forniamo anche l'URL per facilitare il testing
      if (process.env.NODE_ENV === "development") {
        return res.status(200).json({
          success: true,
          message:
            "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
          devInfo: { resetUrl },
        });
      }

      // Risposta standard
      return res.status(200).json({
        success: true,
        message:
          "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
      });
    } catch (emailError) {
      // Log dell'errore ma non lo esponiamo all'utente per sicurezza
      console.error(
        "Errore nell'invio dell'email di reset password:",
        emailError
      );

      return res.status(200).json({
        success: true,
        message:
          "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
      });
    }
  } catch (error) {
    console.error(
      "Errore nell'elaborazione della richiesta di reset password:",
      error
    );
    // Per sicurezza, non riveliamo dettagli specifici dell'errore
    res.status(500).json({ error: "Errore nell'elaborazione della richiesta" });
  }
}

// Funzione per gestire le richieste di contatto
export async function handleContactRequest(req: Request, res: Response) {
  const { name, email, message } = req.body;

  // Validazione
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    // Invia l'email usando nodemailer
    const info = await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "docgenius8@gmail.com", // Email fissa di destinazione
      subject: `Richiesta di assistenza da ${name}`,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nuova richiesta di assistenza</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Da:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Messaggio:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Questo messaggio è stato inviato dal form di contatto del Sistema di Gestione Documenti ISO.
          </p>
        </div>
      `,
    });

    console.log("Email inviata:", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Errore nell'invio dell'email:", error);
    res.status(500).json({ error: "Errore nell'invio dell'email" });
  }
}
