import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from 'fastify-multipart';

import { FileTypeStream } from '../../../utils/stream-file-type.util';
import { StatusCode } from '../../../enums/status-code.enum';
import { DEFAULT_UPLOAD_SIZE } from '../../../config';

@Injectable()
export class UploadFileInterceptor implements NestInterceptor {
  private fileSize: number;
  private mimeTypes: string[];

  constructor(fileSize: number = DEFAULT_UPLOAD_SIZE, mimeTypes: string[] = []) {
    this.fileSize = fileSize;
    this.mimeTypes = mimeTypes;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest() as FastifyRequest;
    const isMultipart = req.isMultipart();
    if (!isMultipart)
      throw new HttpException({ code: StatusCode.REQUIRE_MULTIPART, message: 'multipart/form-data is required' }, HttpStatus.BAD_REQUEST);
    let file: MultipartFile;
    try {
      const files = await req.saveRequestFiles({ limits: { files: 1, fileSize: this.fileSize } });
      if (files.length)
        file = files[0];
    } catch (e) {
      if (e.code === 'FST_REQ_FILE_TOO_LARGE')
        throw new HttpException({ code: StatusCode.FILE_TOO_LARGE, message: 'file is too large' }, HttpStatus.BAD_REQUEST);
      else if (e.code === 'FST_FILES_LIMIT')
        throw new HttpException({ code: StatusCode.FILES_LIMIT_REACHED, message: 'files limit reached' }, HttpStatus.BAD_REQUEST);
      else
        throw e;
    }
    if (!file)
      throw new HttpException({ code: StatusCode.REQUIRE_FILE, message: 'file is required' }, HttpStatus.BAD_REQUEST);
    if (this.mimeTypes?.length) {
      if (!this.mimeTypes.includes(file.mimetype))
        throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    req.incomingFile = file;
    // Validate the file
    const fileTypeStream = new FileTypeStream(file.filepath);
    const fileType = await fileTypeStream.runAsync();
    if (!fileType)
      throw new HttpException({ code: StatusCode.FILE_DETECTION, message: 'failed to detect file type' }, HttpStatus.UNPROCESSABLE_ENTITY)
    req.incomingFile.detectedMimetype = fileType.mime;
    req.incomingFile.detectedExt = fileType.ext;
    if (this.mimeTypes?.length) {
      if (!this.mimeTypes.includes(file.mimetype))
        throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    return next.handle();
  }
}