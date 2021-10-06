import fs from 'fs';
import readline from 'readline';

export function readFirstLine(filePath: string) {
  return new Promise<string>((resolve) => {
    const readable = fs.createReadStream(filePath);
    const reader = readline.createInterface({ input: readable });
    reader.on('line', (line) => {
      reader.close();
      readable.close();
      resolve(line);
    });
  });
}