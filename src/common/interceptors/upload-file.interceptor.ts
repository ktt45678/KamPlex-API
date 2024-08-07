import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { SavedMultipartFile } from '@fastify/multipart';
import * as magic from 'stream-mmmagic';
import * as fs from 'fs';

import { StatusCode } from '../../enums';
import { DEFAULT_UPLOAD_SIZE } from '../../config';

@Injectable()
export class UploadFileInterceptor implements NestInterceptor {
  private maxSize: number;
  private mimeTypes: string[];
  private skipMimeTypeDetection: boolean;

  constructor(options?: UploadFileOptions) {
    this.maxSize = options?.maxSize || DEFAULT_UPLOAD_SIZE;
    this.mimeTypes = options?.mimeTypes || [];
    this.skipMimeTypeDetection = options?.skipMimeTypeDetection || false;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest() as FastifyRequest;
    if (!req.isMultipart())
      throw new HttpException({ code: StatusCode.REQUIRE_MULTIPART, message: 'Multipart/form-data is required' }, HttpStatus.BAD_REQUEST);
    let file: SavedMultipartFile;
    try {
      const files = await req.saveRequestFiles({ limits: { files: 1, fileSize: this.maxSize } });
      if (files.length)
        file = files[0];
    } catch (e) {
      if (e.code === 'FST_REQ_FILE_TOO_LARGE')
        throw new HttpException({ code: StatusCode.FILE_TOO_LARGE, message: 'File is too large' }, HttpStatus.BAD_REQUEST);
      else if (e.code === 'FST_FILES_LIMIT')
        throw new HttpException({ code: StatusCode.FILES_LIMIT_REACHED, message: 'Files limit reached' }, HttpStatus.BAD_REQUEST);
      else
        throw e;
    }
    if (!file)
      throw new HttpException({ code: StatusCode.REQUIRE_FILE, message: 'File is required' }, HttpStatus.BAD_REQUEST);
    // We don't need this stream
    file.file.destroy();
    req.incomingFile = {
      filepath: file.filepath,
      fieldname: file.fieldname,
      filename: file.filename,
      encoding: file.encoding,
      mimetype: file.mimetype,
      fields: file.fields
    };
    if (!this.skipMimeTypeDetection) {
      // Validate the file
      const fileTypeStream = fs.createReadStream(file.filepath);
      const [fileType]: [{ type: string, encoding: string }] = await (<any>magic).promise(fileTypeStream);
      fileTypeStream.destroy();
      if (!fileType)
        throw new HttpException({ code: StatusCode.FILE_DETECTION, message: 'Failed to detect file type' }, HttpStatus.UNPROCESSABLE_ENTITY);
      if (this.mimeTypes?.length) {
        if (!this.mimeTypes.includes(fileType.type))
          throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
      req.incomingFile.detectedMimetype = fileType.type;
    } else {
      if (this.mimeTypes?.length) {
        if (!this.mimeTypes.includes(file.mimetype))
          throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
      req.incomingFile.detectedMimetype = file.mimetype;
    }
    return next.handle();
  }
}

interface UploadFileOptions {
  maxSize?: number;
  mimeTypes?: string[];
  skipMimeTypeDetection?: boolean;
}
