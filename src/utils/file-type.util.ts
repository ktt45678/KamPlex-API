import { open } from 'fs/promises';
import { fileTypeFromFile } from 'file-type';

const TEXT_SAMPLE_SIZE = 4096;

export async function detectMimeType(filepath: string): Promise<string | undefined> {
  const fileType = await fileTypeFromFile(filepath);
  if (fileType)
    return fileType.mime;
  // Check plain text
  if (await isTextFile(filepath))
    return 'text/plain';
  return undefined;
}

async function isTextFile(filepath: string): Promise<boolean> {
  const handle = await open(filepath, 'r');
  try {
    const sample = new Uint8Array(TEXT_SAMPLE_SIZE);
    const { bytesRead } = await handle.read(sample, 0, TEXT_SAMPLE_SIZE, 0);
    if (!bytesRead)
      return false;
    return isTextSample(sample.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

// Check UTF-16 BOM, or any 8-bit text (UTF-8, Latin-1, Windows-1252)
function isTextSample(sample: Uint8Array): boolean {
  if (sample.length >= 2 && ((sample[0] === 0xFF && sample[1] === 0xFE) || (sample[0] === 0xFE && sample[1] === 0xFF)))
    return true;
  for (const byte of sample) {
    // Allow tab, line feed, vertical tab, form feed, carriage return and escape
    if (byte < 0x20 && !(byte >= 0x09 && byte <= 0x0D) && byte !== 0x1B)
      return false;
  }
  return true;
}
