// Source: https://github.com/LinusU/stream-file-type

import { PassThrough, Transform, TransformCallback } from 'stream';
import { fromStream, FileTypeResult } from 'file-type';
import * as fs from 'fs';

const kResult = Symbol('result');
const kStream = Symbol('stream');

export class FileType extends Transform {
  constructor() {
    super();
    this[kStream] = new PassThrough();
    this[kResult] = fromStream(this[kStream]).then(
      (value) => {
        this[kStream] = null;
        this.emit('file-type', value || null);
        return value || null;
      },
      () => {
        this[kStream] = null;
        this.emit('file-type', null);
        return null;
      }
    );
  }

  fileTypePromise() {
    return this[kResult];
  }

  _transform(chunk: any, _: BufferEncoding, cb: TransformCallback) {
    if (this[kStream] != null) {
      this[kStream].write(chunk);
    }
    cb(null, chunk);
  }

  _flush(cb: TransformCallback) {
    if (this[kStream] != null) {
      this[kStream].end(() => cb(null));
    } else {
      cb(null);
    }
  }
}

export class FileTypeStream {
  filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  runAsync() {
    return new Promise<FileTypeResult>((resolve) => {
      const detector = new FileType();
      const stream = fs.createReadStream(this.filePath);
      detector.on('file-type', (fileType: FileTypeResult) => {
        resolve(fileType);
        stream.close();
      });
      stream.pipe(detector).resume();
    });
  }
}
