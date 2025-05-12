import { createHmac, randomBytes } from 'crypto';
import { mongoStorage as storage } from './mongo-storage';

const SECRET_KEY = process.env.LINK_SECRET_KEY || randomBytes(32).toString('hex');
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 ore in millisecondi

/**
 * Genera un link sicuro con scadenza per un documento o un'azione
 * @param documentId ID del documento o null se è un link per reset password
 * @param userId ID dell'utente che ha generato il link
 * @param action Tipo di azione ('view', 'download', 'reset-password')
 * @param expiryMs Durata di validità del link in millisecondi
 * @returns URL sicuro con token di validazione e timestamp di scadenza
 */
export function generateSecureLink(
  documentId: number | null,
  userId: number,
  action: string,
  expiryMs: number = DEFAULT_EXPIRY
): string {
  // Genera un timestamp di scadenza
  const expires = Date.now() + expiryMs;
  
  // Dati da includere nel token
  const data = {
    documentId,
    userId,
    action,
    expires
  };
  
  // Converti in stringa per la firma
  const dataString = JSON.stringify(data);
  const dataBuffer = Buffer.from(dataString);
  const encodedData = dataBuffer.toString('base64');
  
  // Genera la firma HMAC
  const hmac = createHmac('sha256', SECRET_KEY);
  hmac.update(`${encodedData}.${expires}`);
  const signature = hmac.digest('base64url');
  
  // Registra il link nel log
  if (userId) {
    storage.createLog({
      userId,
      action: 'create-secure-link',
      documentId: documentId || undefined,
      details: {
        action,
        expires: new Date(expires).toISOString(),
        timestamp: new Date().toISOString()
      }
    }).catch(err => console.error('Errore nella registrazione del link sicuro:', err));
  }
  
  // Restituisci l'URL completo
  return `/api/secure/${encodedData}/${expires}/${signature}`;
}

/**
 * Verifica un link sicuro
 * @param encodedData Dati codificati in base64
 * @param expires Timestamp di scadenza
 * @param signature Firma HMAC
 * @returns Dati del link se valido, altrimenti null
 */
export function verifySecureLink(
  encodedData: string,
  expires: string,
  signature: string
): { documentId: number | null; userId: number; action: string; expires: number } | null {
  // Verifica se il link è scaduto
  const expiryTime = parseInt(expires, 10);
  if (isNaN(expiryTime) || Date.now() > expiryTime) {
    return null; // Link scaduto
  }
  
  // Verifica la firma
  const hmac = createHmac('sha256', SECRET_KEY);
  hmac.update(`${encodedData}.${expires}`);
  const expectedSignature = hmac.digest('base64url');
  
  if (signature !== expectedSignature) {
    return null; // Firma non valida
  }
  
  try {
    // Decodifica i dati
    const dataBuffer = Buffer.from(encodedData, 'base64');
    const dataString = dataBuffer.toString();
    const data = JSON.parse(dataString);
    
    return {
      documentId: data.documentId,
      userId: data.userId,
      action: data.action,
      expires: expiryTime
    };
  } catch (error) {
    console.error('Errore nella decodifica del link sicuro:', error);
    return null;
  }
}
