import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SavedMultipartFile } from '@fastify/multipart';
import mimeTypes from 'mime-types';
import { Observable } from 'rxjs';
import sharp from 'sharp';
import fs from 'fs';

import { appendToFilename, getScaledSizes, rgbToDec, rgbaToThumbHash, thumbHashToAverageRGBA } from '../../utils';
import { StatusCode } from '../../enums';
import { DEFAULT_UPLOAD_SIZE } from '../../config';

@Injectable()
export class UploadImageInterceptor implements NestInterceptor {
  private maxSize: number;
  private mimeTypes: string[];
  private maxWidth: number;
  private maxHeight: number;
  private minWidth: number;
  private minHeight: number;
  private ratio: number[];
  private allowUrl: boolean;
  private autoResize: boolean;

  constructor(options?: UploadImageOptions) {
    options = Object.assign({}, {
      maxSize: DEFAULT_UPLOAD_SIZE, mimeTypes: [], maxWidth: 0, maxHeight: 0,
      minWidth: 0, minHeight: 0, ratio: [], allowUrl: false, autoResize: false
    }, options);
    this.maxSize = options.maxSize;
    this.mimeTypes = options.mimeTypes;
    this.maxWidth = options.maxWidth;
    this.maxHeight = options.maxHeight;
    this.minWidth = options.minWidth;
    this.minHeight = options.minHeight;
    this.ratio = options.ratio.length === 2 && options.ratio;
    this.allowUrl = options.allowUrl;
    this.autoResize = options.autoResize;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest() as FastifyRequest;
    if (req.isMultipart()) {
      let file: SavedMultipartFile;
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
      // We don't need this stream
      file.file.destroy();
      if (this.mimeTypes?.length) {
        if (!this.mimeTypes.includes(file.mimetype))
          throw new HttpException({ code: StatusCode.FILE_UNSUPPORTED, message: 'Unsupported file type' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
      try {
        //const result = await getAverageColor(file.filepath);
        var info = await sharp(file.filepath, { pages: 1 }).metadata();
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
      const targetWidth = Math.ceil(info.height * this.ratio[0] / this.ratio[1]);
      if (this.ratio && targetWidth !== info.width) {
        if (!this.autoResize)
          throw new HttpException({ code: StatusCode.IMAGE_RATIO, message: 'Invalid aspect ratio' }, HttpStatus.BAD_REQUEST);
        const tempFilePath = appendToFilename(file.filepath, '_resized');
        await sharp(file.filepath, { pages: -1 }).resize({ width: targetWidth, height: info.height }).toFile(tempFilePath);
        await fs.promises.rename(tempFilePath, file.filepath);
        info = await sharp(file.filepath, { pages: 1 }).metadata();
      }
      const thumbhashResult = await this.createThumbhash(file.filepath, info.width, info.height);
      req.incomingFile = {
        filepath: file.filepath,
        fieldname: file.fieldname,
        filename: file.filename,
        encoding: file.encoding,
        mimetype: file.mimetype,
        fields: file.fields
      };
      req.incomingFile.detectedMimetype = detectedMimetype;
      req.incomingFile.color = thumbhashResult.averageColorDec;
      req.incomingFile.thumbhash = thumbhashResult.b64;
      req.incomingFile.isUrl = false;
    } else if (this.allowUrl && (<any>req.body)?.url) {
      const url = (<any>req.body).url;
      const imageBuffer = await this.getImageFromUrl(url);
      try {
        //const result = await getAverageColor(url);
        var info = await sharp(imageBuffer, { pages: 1 }).metadata();
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
      if (this.ratio && (info.height * this.ratio[0] / this.ratio[1]) !== info.width)
        throw new HttpException({ code: StatusCode.IMAGE_RATIO, message: 'Invalid aspect ratio' }, HttpStatus.BAD_REQUEST);
      const thumbhashResult = await this.createThumbhash(imageBuffer, info.width, info.height);
      req.incomingFile.filepath = url;
      req.incomingFile.mimetype = detectedMimetype;
      req.incomingFile.detectedMimetype = detectedMimetype;
      req.incomingFile.color = thumbhashResult.averageColorDec;
      req.incomingFile.thumbhash = thumbhashResult.b64;
      req.incomingFile.filename = url.split('/').pop().split('#')[0].split('?')[0];
      req.incomingFile.isUrl = true;
    } else {
      throw new HttpException({ code: StatusCode.REQUIRE_MULTIPART, message: 'Multipart/form-data is required' }, HttpStatus.BAD_REQUEST);
    }
    return next.handle();
  }

  private async createThumbhash(input: string | Buffer, srcWidth: number, srcHeight: number) {
    const scaledSizes = getScaledSizes(srcWidth, srcHeight, 100, 100);
    const rgba = await sharp(input).resize({ width: scaledSizes.width, height: scaledSizes.height }).ensureAlpha().raw().toBuffer();
    const thumbhash = rgbaToThumbHash(scaledSizes.width, scaledSizes.height, rgba);
    const b64 = Buffer.from(thumbhash).toString('base64').replace(/\=+$/, '');
    const averageColorRBGA = thumbHashToAverageRGBA(thumbhash);
    const averageColorDec = rgbToDec(averageColorRBGA.r, averageColorRBGA.g, averageColorRBGA.b);
    return { b64, averageColorDec };
  }

  private async getImageFromUrl(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

interface UploadImageOptions {
  maxSize?: number;
  mimeTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  ratio?: number[];
  allowUrl?: boolean;
  autoResize?: boolean;
}
