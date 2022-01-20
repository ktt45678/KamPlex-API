import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from 'fastify-multipart';
import { Palette } from '@vibrant/color';
import Vibrant from 'node-vibrant';
import probe from 'probe-image-size';
import * as fs from 'fs';

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

  constructor(override?: { maxSize?: number, mimeTypes?: string[], maxWidth?: number, maxHeight?: number, minWidth?: number, minHeight?: number, ratio?: number, allowUrl?: boolean }) {
    const options = { ...defaultOptions, ...override };
    this.maxSize = options.maxSize;
    this.mimeTypes = options.mimeTypes;
    this.maxWidth = options.maxWidth;
    this.maxHeight = options.maxHeight;
    this.minWidth = options.minWidth;
    this.minHeight = options.minHeight;
    this.ratio = options.ratio;
    this.allowUrl = options.allowUrl;
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
      let info: probe.ProbeResult;
      let color: Palette;
      try {
        info = await probe(fs.createReadStream(file.filepath));
        color = await Vibrant.from(file.filepath).getPalette();
      } catch (e) {
        console.error(e);
        throw new HttpException({ code: StatusCode.FILE_DETECTION, message: 'Failed to detect file type' }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      const bestColor = color[Object.keys(color).reduce((a, b) => color[a].population > color[b].population ? a : b)];
      if (this.mimeTypes?.length && file.mimetype !== info.mime)
        throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      if ((this.maxHeight && info.height > this.maxHeight) || (this.maxWidth && info.width > this.maxWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MAX_DIMENSIONS, message: 'Image dimensions are too high' }, HttpStatus.BAD_REQUEST);
      if ((this.minHeight && info.height < this.minHeight) || (this.minWidth && info.width < this.minWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MIN_DIMENSIONS, message: 'Image dimensions are too low' }, HttpStatus.BAD_REQUEST);
      if (this.ratio && (info.width / info.height) !== this.ratio)
        throw new HttpException({ code: StatusCode.IMAGE_RATIO, message: 'Invalid aspect ratio' }, HttpStatus.BAD_REQUEST);
      req.incomingFile = file;
      req.incomingFile.detectedMimetype = info.mime;
      req.incomingFile.color = parseInt(bestColor.hex.substring(1), 16);
      req.incomingFile.isUrl = false;
    } else if (this.allowUrl && (<any>req.body)?.url) {
      const url = (<any>req.body)?.url;
      let info: probe.ProbeResult;
      try {
        info = await probe(url);
      } catch (e) {
        throw new HttpException({ code: StatusCode.FILE_DETECTION, message: 'Failed to detect file type' }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      if (this.mimeTypes?.length) {
        if (!this.mimeTypes.includes(info.mime))
          throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
      if (info.length && info.length > this.maxSize)
        throw new HttpException({ code: StatusCode.FILE_TOO_LARGE, message: 'File is too large' }, HttpStatus.BAD_REQUEST);
      if ((this.maxHeight && info.height > this.maxHeight) || (this.maxWidth && info.width > this.maxWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MAX_DIMENSIONS, message: 'Image dimensions are too high' }, HttpStatus.BAD_REQUEST);
      if ((this.minHeight && info.height < this.minHeight) || (this.minWidth && info.width < this.minWidth))
        throw new HttpException({ code: StatusCode.IMAGE_MIN_DIMENSIONS, message: 'Image dimensions are too low' }, HttpStatus.BAD_REQUEST);
      if (this.ratio && (info.width / info.height) !== this.ratio)
        throw new HttpException({ code: StatusCode.IMAGE_RATIO, message: 'Invalid aspect ratio' }, HttpStatus.BAD_REQUEST);
      req.incomingFile.filepath = url;
      req.incomingFile.mimetype = info.mime;
      req.incomingFile.detectedMimetype = info.mime;
      req.incomingFile.filename = info.url.split('/').pop().split('#')[0].split('?')[0];
      req.incomingFile.isUrl = true;
    } else {
      throw new HttpException({ code: StatusCode.REQUIRE_MULTIPART, message: 'Multipart/form-data is required' }, HttpStatus.BAD_REQUEST);
    }
    return next.handle();
  }
}

const defaultOptions = {
  maxSize: DEFAULT_UPLOAD_SIZE,
  mimeTypes: [],
  maxWidth: 0,
  maxHeight: 0,
  minWidth: 0,
  minHeight: 0,
  ratio: 0,
  allowUrl: false
}