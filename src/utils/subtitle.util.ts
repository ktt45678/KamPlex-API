import fs from 'fs';

//https://github.com/pensierinmusica/firstline/blob/master/index.js
export function readFirstLine(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const rs = fs.createReadStream(filePath, { encoding: 'utf8' });
    let acc = '';
    let pos = 0;
    let index: number;
    rs.on('data', chunk => {
      index = chunk.indexOf('\n');
      acc += chunk;
      if (index === -1) {
        pos += chunk.length;
      } else {
        pos += index;
        rs.close();
      }
    })
      .on('close', () => resolve(acc.slice(acc.charCodeAt(0) === 0xFEFF ? 1 : 0, pos)))
      .on('error', err => reject(err));
  });
}
