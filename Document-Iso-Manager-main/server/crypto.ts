import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Encryption key management
const KEY_SIZE = 32; // 256 bits
const IV_SIZE = 16; // 128 bits
const ALGORITHM = 'aes-256-cbc';

// For a real production app, store this securely in a key management system
// or use environment variables
let encryptionKey = process.env.ENCRYPTION_KEY || '';

// Generate key if not provided
if (!encryptionKey) {
  encryptionKey = randomBytes(KEY_SIZE).toString('hex');
  console.warn('No encryption key found in environment. Generated temporary key.');
  console.warn('For production, set ENCRYPTION_KEY env variable!');
}

// Ensure key is the right size
const normalizedKey = createHash('sha256').update(encryptionKey).digest();

/**
 * Encrypt a file and save to destination path
 * @param sourceFilePath Original file path
 * @param destFilePath Where to save encrypted file
 * @returns Path to encrypted file
 */
export async function encryptFile(sourceFilePath: string, destFilePath: string): Promise<string> {
  const readFile = promisify(fs.readFile);
  const writeFile = promisify(fs.writeFile);
  const mkdir = promisify(fs.mkdir);

  // Make directory if it doesn't exist
  const destDir = path.dirname(destFilePath);
  await mkdir(destDir, { recursive: true });

  // Generate IV
  const iv = randomBytes(IV_SIZE);
  
  // Create cipher
  const cipher = createCipheriv(ALGORITHM, normalizedKey, iv);
  
  // Read file
  const fileData = await readFile(sourceFilePath);
  
  // Encrypt
  const encryptedData = Buffer.concat([
    iv, // Store IV at the beginning of file
    cipher.update(fileData),
    cipher.final()
  ]);
  
  // Write encrypted file
  await writeFile(destFilePath, encryptedData);
  
  return destFilePath;
}

/**
 * Decrypt a file and save to destination path or return buffer
 * @param encryptedFilePath Path to encrypted file
 * @param destFilePath Optional destination path for decrypted file
 * @returns Buffer with decrypted content or path to decrypted file
 */
export async function decryptFile(
  encryptedFilePath: string, 
  destFilePath?: string
): Promise<Buffer | string> {
  const readFile = promisify(fs.readFile);
  const writeFile = promisify(fs.writeFile);
  
  // Read encrypted file
  const encryptedData = await readFile(encryptedFilePath);
  
  // Extract IV from beginning of file
  const iv = encryptedData.slice(0, IV_SIZE);
  const encryptedContent = encryptedData.slice(IV_SIZE);
  
  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, normalizedKey, iv);
  
  // Decrypt
  const decryptedData = Buffer.concat([
    decipher.update(encryptedContent),
    decipher.final()
  ]);
  
  // If destination path provided, write decrypted file
  if (destFilePath) {
    await writeFile(destFilePath, decryptedData);
    return destFilePath;
  }
  
  // Otherwise return buffer
  return decryptedData;
}

/**
 * Create a SHA-256 hash of a file's content
 * @param filePath Path to file to hash
 * @returns SHA-256 hash as hex string
 */
export async function hashFile(filePath: string): Promise<string> {
  const readFile = promisify(fs.readFile);
  const data = await readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verify a file's hash matches expected hash
 * @param filePath Path to file to verify
 * @param expectedHash Expected SHA-256 hash
 * @returns True if hash matches, false otherwise
 */
export async function verifyFileIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
  const actualHash = await hashFile(filePath);
  return actualHash === expectedHash;
}
