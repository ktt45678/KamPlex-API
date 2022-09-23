import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import mimeTypes from 'mime-types';

import { getAverageColor } from '../../../utils';
import { StatusCode } from '../../../enums';
import { DEFAULT_UPLOAD_SIZE } from '../../../config';

@Injectable()
export class UploadImageInterceptor implements NestInterceptor {
  private maxSize: number;
  private mimeTypes: string[];
  private maxWidth: number;
  private maxHeight: number;
  private minWidth: number;
  private minHeight: number;
  private ratio: number;
  private allowUrl: boolean;

  constructor(options?: UploadImageOptions) {
    this.maxSize = options?.maxSize || DEFAULT_UPLOAD_SIZE;
    this.mimeTypes = options?.mimeTypes || [];
    this.maxWidth = options?.maxWidth || 0;
    this.maxHeight = options?.maxHeight || 0;
    this.minWidth = options?.minWidth || 0;
    this.minHeight = options?.minHeight || 0;
    this.ratio = options?.ratio || 0;
    this.allowUrl = options?.allowUrl || false;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest() as FastifyRequest;
    if (req.isMultipart()) {
      let file: MultipartFile;
      try {
        const files = await req.saveRequestFiles({ limits: { files: 1, fileSize: this.maxSize } });
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
      if (this.mimeTypes?.length) {
        if (!this.mimeTypes.includes(file.mimetype))
          throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
      try {
        const result = await getAverageColor(file.filepath);
        var info = result.metadata;
        var color = result.color;
      } catch (e) {
        console.error(e);
        throw new HttpException({ code: StatusCode.FILE_DETECTION, message: 'Failed to detect file type' }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      const detectedMimetype = mimeTypes.lookup(info.format) || 'application/octet-stream';
      if (this.mimeTypes?.length && file.mimetype !== detectedMimetype)
        throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      if ((this.maxHeight && info.height > this.maxHeight) || (this.maxWidth && info.width > this.maxWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MAX_DIMENSIONS, message: 'Image dimensions are too high' }, HttpStatus.BAD_REQUEST);
      if ((this.minHeight && info.height < this.minHeight) || (this.minWidth && info.width < this.minWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MIN_DIMENSIONS, message: 'Image dimensions are too low' }, HttpStatus.BAD_REQUEST);
      if (this.ratio && (info.width / info.height) !== this.ratio)
        throw new HttpException({ code: StatusCode.IMAGE_RATIO, message: 'Invalid aspect ratio' }, HttpStatus.BAD_REQUEST);
      req.incomingFile = file;
      req.incomingFile.detectedMimetype = detectedMimetype;
      req.incomingFile.color = parseInt(color.hex.substring(1), 16);
      req.incomingFile.isUrl = false;
    } else if (this.allowUrl && (<any>req.body)?.url) {
      const url = (<any>req.body).url;
      try {
        const result = await getAverageColor(url);
        var info = result.metadata;
        var color = result.color;
      } catch (e) {
        throw new HttpException({ code: StatusCode.FILE_DETECTION, message: 'Failed to detect file type' }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      const detectedMimetype = mimeTypes.lookup(info.format) || 'application/octet-stream';
      if (this.mimeTypes?.length) {
        if (!this.mimeTypes.includes(detectedMimetype))
          throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
      if (info.size && info.size > this.maxSize)
        throw new HttpException({ code: StatusCode.FILE_TOO_LARGE, message: 'File is too large' }, HttpStatus.BAD_REQUEST);
      if ((this.maxHeight && info.height > this.maxHeight) || (this.maxWidth && info.width > this.maxWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MAX_DIMENSIONS, message: 'Image dimensions are too high' }, HttpStatus.BAD_REQUEST);
      if ((this.minHeight && info.height < this.minHeight) || (this.minWidth && info.width < this.minWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MIN_DIMENSIONS, message: 'Image dimensions are too low' }, HttpStatus.BAD_REQUEST);
      if (this.ratio && (info.width / info.height) !== this.ratio)
        throw new HttpException({ code: StatusCode.IMAGE_RATIO, message: 'Invalid aspect ratio' }, HttpStatus.BAD_REQUEST);
      req.incomingFile.filepath = url;
      req.incomingFile.mimetype = detectedMimetype;
      req.incomingFile.detectedMimetype = detectedMimetype;
      req.incomingFile.color = parseInt(color.hex.substring(1), 16);
      req.incomingFile.filename = url.split('/').pop().split('#')[0].split('?')[0];
      req.incomingFile.isUrl = true;
    } else {
      throw new HttpException({ code: StatusCode.REQUIRE_MULTIPART, message: 'Multipart/form-data is required' }, HttpStatus.BAD_REQUEST);
    }
    return next.handle();
  }
}

interface UploadImageOptions {
  maxSize?: number;
  mimeTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  ratio?: number;
  allowUrl?: boolean;
}