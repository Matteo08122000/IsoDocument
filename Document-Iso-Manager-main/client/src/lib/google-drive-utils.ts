/**
 * Estrae l'ID della cartella di Google Drive da un URL completo o restituisce l'ID se è già un ID.
 * 
 * Esempi di URL supportati:
 * - https://drive.google.com/drive/folders/ABCDEF123456
 * - https://drive.google.com/drive/u/0/folders/ABCDEF123456
 * - https://drive.google.com/drive/my-drive/ABCDEF123456
 * - https://drive.google.com/open?id=ABCDEF123456
 * 
 * @param input URL o ID della cartella di Google Drive
 * @returns ID della cartella di Google Drive o null se non valido
 */
export function extractFolderIdFromUrl(input: string): string | null {
  // Se l'input è vuoto, restituisci null
  if (!input || input.trim() === '') {
    return null;
  }
  
  // Pattern per gli URL di Google Drive
  const patterns = [
    // Pattern per URL con 'folders'
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:[\?#][^\s]*)?/,
    // Pattern per URL con 'my-drive'
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?my-drive\/([a-zA-Z0-9_-]+)(?:[\?#][^\s]*)?/,
    // Pattern per URL con 'open?id='
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(?:&[^\s]*)?/
  ];

  // Prova tutti i pattern e restituisci il primo match
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Se è già un ID senza URL, restituisci l'input originale
  // Gli ID di Google Drive solitamente hanno questo formato
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }

  return null;
}
