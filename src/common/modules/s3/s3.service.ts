import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { createHmac, createHash } from 'crypto';
import { firstValueFrom } from 'rxjs';
import path from 'path';

import { StatusCode } from '../../../enums';
import { ExternalStorageAccess } from '../../interfaces';
import { ExternalStoragesService } from '../../../resources/external-storages/external-storages.service';
import { SettingsService } from '../../../resources/settings/settings.service';
import { S3_PRESIGNED_URL_EXPIRY, S3_UPLOAD_MAX_PARTS, S3_UPLOAD_PART_SIZE } from '../../../config';

const XML_ENTITIES: Record<string, string> = { lt: '<', gt: '>', quot: '"', apos: '\'', amp: '&' };

@Injectable()
export class S3Service {
  private signatureKeys = new Map<string, Buffer>();
  private signatureKeysDate: string | null = null;

  constructor(private httpService: HttpService,
    @Inject(forwardRef(() => SettingsService)) private settingsService: SettingsService,
    @Inject(forwardRef(() => ExternalStoragesService)) private externalStoragesService: ExternalStoragesService) { }

  async findInStorages(filePath: string, storages: ExternalStorageAccess[], retry: number = 3, retryTimeout: number = 0) {
    for (let i = 0; i < storages.length; i++) {
      const storage = storages[i];
      await this.externalStoragesService.decryptToken(storage);
      for (let j = 0; j < retry; j++) {
        try {
          const fileInfo = await this.headObject(storage, filePath);
          return { storage: storage, file: { id: filePath, name: filePath.split('/').pop(), size: fileInfo.contentLength, file: { mimeType: fileInfo.contentType } } };
        } catch (e) {
          if (j < retry - 1)
            await new Promise(r => setTimeout(r, retryTimeout));
          else if (e.response?.status === 404)
            break;
          else
            this.throwRequestFailed(e);
        }
      }
    }
    return null;
  }

  async findPath(path: string, storageId: bigint, retry: number = 3, retryTimeout: number = 0) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    await this.externalStoragesService.decryptToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const fileInfo = await this.headObject(storage, path);
        return { id: path, name: path.split('/').pop(), size: fileInfo.contentLength, file: { mimeType: fileInfo.contentType } };
      } catch (e) {
        if (i < retry - 1)
          await new Promise(r => setTimeout(r, retryTimeout));
        else
          this.throwRequestFailed(e);
      }
    }
  }

  async findId(fileId: string, storage: ExternalStorageAccess, retry: number = 3, retryTimeout: number = 0) {
    await this.externalStoragesService.decryptToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const fileInfo = await this.headObject(storage, fileId);
        return { id: fileId, name: fileId.split('/').pop(), size: fileInfo.contentLength, file: { mimeType: fileInfo.contentType } };
      } catch (e) {
        if (e.response?.status === 404)
          throw new HttpException({ code: StatusCode.DRIVE_FILE_NOT_FOUND, message: 'File not found' }, HttpStatus.NOT_FOUND);
        if (i < retry - 1)
          await new Promise(r => setTimeout(r, retryTimeout));
        else
          this.throwRequestFailed(e);
      }
    }
  }

  async deleteFolder(folder: bigint | string, storage: ExternalStorageAccess, retry: number = 5, retryTimeout: number = 3000) {
    await this.externalStoragesService.decryptToken(storage);
    const prefix = this.resolveKey(storage, folder.toString()) + '/';
    for (let i = 0; i < retry; i++) {
      try {
        await this.abortUploadsWithPrefix(storage, prefix);
        let keys: string[];
        do {
          keys = await this.listObjectKeys(storage, prefix);
          if (keys.length)
            await this.deleteObjects(storage, keys);
        } while (keys.length);
        return;
      } catch (e) {
        if (i < retry - 1)
          await new Promise(r => setTimeout(r, retryTimeout));
        else
          this.throwRequestFailed(e);
      }
    }
  }

  async createUploadSession(name: string, folder: string, mimeType: string, size: number) {
    const storage = await this.settingsService.findMediaSourceStorage();
    await this.externalStoragesService.decryptToken(storage);
    const key = path.posix.join(folder, name);
    const { host, bucketPath } = this.parsePublicUrl(storage.publicUrl);
    const canonicalUri = this.encodeCanonicalUri(`${bucketPath}/${this.resolveKey(storage, key)}`);
    const canonicalQuerystring = this.canonicalQuery({ uploads: '' });
    const payloadHash = this.hash('');

    const authHeader = this.getAuthorizationHeader(
      storage.clientId, storage.clientSecret, host, canonicalUri,
      'POST', canonicalQuerystring, payloadHash,
      { 'content-type': mimeType }
    );

    let uploadId: string | null;
    try {
      const response = await firstValueFrom(this.httpService.post(
        `https://${host}${canonicalUri}?${canonicalQuerystring}`,
        '',
        {
          headers: {
            'Content-Type': mimeType,
            ...authHeader
          },
          responseType: 'text'
        }
      ));
      uploadId = this.getXmlValue(response.data, 'UploadId');
    } catch (e) {
      this.throwRequestFailed(e);
    }
    if (!uploadId)
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: 'Failed to create upload session' }, HttpStatus.INTERNAL_SERVER_ERROR);

    const partSize = this.getPartSize(size);
    const partCount = Math.max(1, Math.ceil(size / partSize));
    const partUrls: string[] = [];
    for (let partNumber = 1; partNumber <= partCount; partNumber++)
      partUrls.push(this.presignPartUrl(storage, host, canonicalUri, uploadId, partNumber));

    const sessionUrl = new URL(`https://${host}${canonicalUri}`);
    sessionUrl.searchParams.set('filePath', key);
    sessionUrl.searchParams.set('protocol', 's3');
    return {
      url: sessionUrl.toString(),
      uploadId: uploadId,
      partSize: partSize,
      partUrls: partUrls,
      storage: storage._id
    };
  }

  async completeUpload(fileId: string, uploadId: string, storage: ExternalStorageAccess) {
    await this.externalStoragesService.decryptToken(storage);
    const { host, bucketPath } = this.parsePublicUrl(storage.publicUrl);
    const canonicalUri = this.encodeCanonicalUri(`${bucketPath}/${this.resolveKey(storage, fileId)}`);
    let parts: { partNumber: string; etag: string }[];
    try {
      parts = await this.listParts(storage, host, canonicalUri, uploadId);
    } catch (e) {
      if (e.response?.status !== 404)
        this.throwRequestFailed(e);
    }
    if (parts?.length)
      await this.completeMultipartUpload(storage, host, canonicalUri, uploadId, parts);
    try {
      return await this.findId(fileId, storage);
    } catch (e) {
      if (parts && e instanceof HttpException && e.getStatus() === HttpStatus.NOT_FOUND)
        throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'No part has been uploaded' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      throw e;
    }
  }

  resolvePublicUrl(url: string) {
    return url.replace(':service_path', 's3');
  }

  private getPartSize(size: number) {
    const mib = 1048576;
    const minPartSize = Math.ceil(Math.ceil(size / S3_UPLOAD_MAX_PARTS) / mib) * mib;
    return Math.max(S3_UPLOAD_PART_SIZE, minPartSize);
  }

  private async headObject(storage: ExternalStorageAccess, key: string) {
    const { host, bucketPath } = this.parsePublicUrl(storage.publicUrl);
    const canonicalUri = this.encodeCanonicalUri(`${bucketPath}/${this.resolveKey(storage, key)}`);
    const payloadHash = this.hash('');

    const authHeader = this.getAuthorizationHeader(
      storage.clientId, storage.clientSecret, host, canonicalUri,
      'HEAD', '', payloadHash
    );

    const response = await firstValueFrom(this.httpService.head(
      `https://${host}${canonicalUri}`,
      { headers: authHeader }
    ));
    return {
      contentLength: parseInt(String(response.headers['content-length'] ?? '0'), 10),
      contentType: response.headers['content-type'] || 'application/octet-stream'
    };
  }

  private async listObjectKeys(storage: ExternalStorageAccess, prefix: string) {
    const { host, bucketPath } = this.parsePublicUrl(storage.publicUrl);
    const canonicalUri = this.encodeCanonicalUri(bucketPath);
    const canonicalQuerystring = this.canonicalQuery({ 'list-type': '2', prefix });
    const payloadHash = this.hash('');
    const authHeader = this.getAuthorizationHeader(
      storage.clientId, storage.clientSecret, host, canonicalUri,
      'GET', canonicalQuerystring, payloadHash
    );
    const response = await firstValueFrom(this.httpService.get<string>(
      `https://${host}${canonicalUri}?${canonicalQuerystring}`,
      { headers: authHeader, responseType: 'text' }
    ));
    return this.getXmlValues(response.data, 'Contents').map(c => this.getXmlValue(c, 'Key')).filter(k => k !== null);
  }

  private async deleteObjects(storage: ExternalStorageAccess, keys: string[]) {
    const { host, bucketPath } = this.parsePublicUrl(storage.publicUrl);
    const canonicalUri = this.encodeCanonicalUri(bucketPath);
    const canonicalQuerystring = this.canonicalQuery({ delete: '' });
    const body = '<Delete><Quiet>true</Quiet>' +
      keys.map(k => `<Object><Key>${this.escapeXml(k)}</Key></Object>`).join('') +
      '</Delete>';
    const payloadHash = this.hash(body);
    const contentMd5 = createHash('md5').update(body, 'utf8').digest('base64');
    const authHeader = this.getAuthorizationHeader(
      storage.clientId, storage.clientSecret, host, canonicalUri,
      'POST', canonicalQuerystring, payloadHash,
      { 'content-md5': contentMd5, 'content-type': 'application/xml' }
    );
    const response = await firstValueFrom(this.httpService.post<string>(
      `https://${host}${canonicalUri}?${canonicalQuerystring}`,
      body,
      {
        headers: { 'Content-Type': 'application/xml', 'Content-MD5': contentMd5, ...authHeader },
        responseType: 'text'
      }
    ));
    const errors = this.getXmlValues(response.data, 'Error');
    if (errors.length)
      throw new Error(`Failed to delete ${errors.length} objects: ${this.getXmlValue(errors[0], 'Message') ?? errors[0]}`);
  }

  private presignPartUrl(storage: ExternalStorageAccess, host: string, canonicalUri: string, uploadId: string, partNumber: number) {
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = this.toDateStamp(now);
    const region = 'auto';
    const service = 's3';
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const canonicalQuerystring = this.canonicalQuery({
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': `${storage.clientId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(S3_PRESIGNED_URL_EXPIRY),
      'X-Amz-SignedHeaders': 'host',
      partNumber: String(partNumber),
      uploadId: uploadId
    });
    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuerystring}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${this.hash(canonicalRequest)}`;
    const signingKey = this.getSignatureKey(storage.clientSecret, dateStamp, region, service);
    const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
    return `https://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
  }

  private async listParts(storage: ExternalStorageAccess, host: string, canonicalUri: string, uploadId: string) {
    const parts: { partNumber: string; etag: string }[] = [];
    let marker = '0';
    let isTruncated: boolean;
    do {
      const canonicalQuerystring = this.canonicalQuery({ 'part-number-marker': marker, uploadId });
      const payloadHash = this.hash('');
      const authHeader = this.getAuthorizationHeader(
        storage.clientId, storage.clientSecret, host, canonicalUri,
        'GET', canonicalQuerystring, payloadHash
      );
      const response = await firstValueFrom(this.httpService.get<string>(
        `https://${host}${canonicalUri}?${canonicalQuerystring}`,
        { headers: authHeader, responseType: 'text' }
      ));
      for (const part of this.getXmlValues(response.data, 'Part'))
        parts.push({ partNumber: this.getXmlValue(part, 'PartNumber'), etag: this.getXmlValue(part, 'ETag') });
      isTruncated = this.getXmlValue(response.data, 'IsTruncated') === 'true';
      marker = this.getXmlValue(response.data, 'NextPartNumberMarker');
    } while (isTruncated && marker);
    return parts;
  }

  private async completeMultipartUpload(storage: ExternalStorageAccess, host: string, canonicalUri: string, uploadId: string, parts: { partNumber: string; etag: string }[]) {
    const canonicalQuerystring = this.canonicalQuery({ uploadId });
    const body = '<CompleteMultipartUpload>' +
      parts.map(p => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${this.escapeXml(p.etag)}</ETag></Part>`).join('') +
      '</CompleteMultipartUpload>';
    const payloadHash = this.hash(body);

    const authHeader = this.getAuthorizationHeader(
      storage.clientId, storage.clientSecret, host, canonicalUri,
      'POST', canonicalQuerystring, payloadHash,
      { 'content-type': 'application/xml' }
    );

    try {
      const response = await firstValueFrom(this.httpService.post<string>(
        `https://${host}${canonicalUri}?${canonicalQuerystring}`,
        body,
        {
          headers: {
            'Content-Type': 'application/xml',
            ...authHeader
          },
          responseType: 'text'
        }
      ));
      if (this.getXmlValue(response.data, 'Error') !== null)
        throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'Failed to complete the upload' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    } catch (e) {
      if (e instanceof HttpException)
        throw e;
      if (e.response?.status === 400)
        throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'Uploaded parts are invalid' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      this.throwRequestFailed(e);
    }
  }

  private async abortUploadsWithPrefix(storage: ExternalStorageAccess, prefix: string) {
    const { host, bucketPath } = this.parsePublicUrl(storage.publicUrl);
    const canonicalUri = this.encodeCanonicalUri(bucketPath);
    const canonicalQuerystring = this.canonicalQuery({ prefix, uploads: '' });
    const payloadHash = this.hash('');
    const authHeader = this.getAuthorizationHeader(
      storage.clientId, storage.clientSecret, host, canonicalUri,
      'GET', canonicalQuerystring, payloadHash
    );
    const response = await firstValueFrom(this.httpService.get<string>(
      `https://${host}${canonicalUri}?${canonicalQuerystring}`,
      { headers: authHeader, responseType: 'text' }
    ));
    for (const upload of this.getXmlValues(response.data, 'Upload')) {
      const key = this.getXmlValue(upload, 'Key');
      const uploadId = this.getXmlValue(upload, 'UploadId');
      if (key && uploadId)
        await this.abortUpload(storage, key, uploadId);
    }
  }

  private async abortUpload(storage: ExternalStorageAccess, fullKey: string, uploadId: string) {
    const { host, bucketPath } = this.parsePublicUrl(storage.publicUrl);
    const canonicalUri = this.encodeCanonicalUri(`${bucketPath}/${fullKey}`);
    const canonicalQuerystring = this.canonicalQuery({ uploadId });
    const payloadHash = this.hash('');
    const authHeader = this.getAuthorizationHeader(
      storage.clientId, storage.clientSecret, host, canonicalUri,
      'DELETE', canonicalQuerystring, payloadHash
    );
    await firstValueFrom(this.httpService.delete(
      `https://${host}${canonicalUri}?${canonicalQuerystring}`,
      { headers: authHeader }
    ));
  }

  private throwRequestFailed(e: any): never {
    console.error(e.response ?? e);
    const status = e.response ? `${e.response.status} ${e.response.statusText}` : 'no response';
    throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${status} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
  }

  private resolveKey(storage: ExternalStorageAccess, key: string) {
    return path.posix.join(storage.folderId || '', key).replace(/^\/+/, '');
  }

  private getAuthorizationHeader(
    accessKey: string, secretKey: string, host: string, canonicalUri: string,
    method: string, queryString: string, payloadHash: string,
    extraHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = this.toDateStamp(now);
    const region = 'auto';
    const service = 's3';
    const algorithm = 'AWS4-HMAC-SHA256';

    const allHeaders: Record<string, string> = {
      'host': host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...extraHeaders
    };

    const sortedHeaderKeys = Object.keys(allHeaders).sort();
    const signedHeaders = sortedHeaderKeys.join(';');
    const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${allHeaders[k]}`).join('\n') + '\n';

    const canonicalRequest = `${method}\n${canonicalUri}\n${queryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${this.hash(canonicalRequest)}`;

    const signingKey = this.getSignatureKey(secretKey, dateStamp, region, service);
    const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    return {
      'Host': host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    };
  }

  private getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
    if (this.signatureKeysDate !== dateStamp) {
      this.signatureKeys.clear();
      this.signatureKeysDate = dateStamp;
    }
    const cachedKey = this.signatureKeys.get(secretKey);
    if (cachedKey)
      return cachedKey;
    const kDate = createHmac('sha256', 'AWS4' + secretKey).update(dateStamp, 'utf8').digest();
    const kRegion = createHmac('sha256', kDate).update(region, 'utf8').digest();
    const kService = createHmac('sha256', kRegion).update(service, 'utf8').digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
    this.signatureKeys.set(secretKey, kSigning);
    return kSigning;
  }

  private getXmlValue(xml: string, ...keys: string[]): string | null {
    let current = xml;
    for (const key of keys) {
      const match = current.match(new RegExp(`<${key}>([\\s\\S]*?)</${key}>`));
      if (!match) return null;
      current = match[1];
    }
    return this.unescapeXml(current);
  }

  private getXmlValues(xml: string, key: string): string[] {
    return [...xml.matchAll(new RegExp(`<${key}>([\\s\\S]*?)</${key}>`, 'g'))].map(m => m[1]);
  }

  private escapeXml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private unescapeXml(value: string) {
    return value.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|amp);/gi, (match, entity: string) => {
      if (entity[0] === '#')
        return String.fromCodePoint(entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10));
      return XML_ENTITIES[entity.toLowerCase()];
    });
  }

  private canonicalQuery(params: Record<string, string>) {
    return Object.keys(params).sort().map(k => `${this.encodeRfc3986(k)}=${this.encodeRfc3986(params[k])}`).join('&');
  }

  private encodeRfc3986(value: string) {
    return encodeURIComponent(value).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }

  private encodeCanonicalUri(uri: string): string {
    return '/' + uri.replace(/^\//, '').split('/').map(segment => this.encodeRfc3986(segment)).join('/');
  }

  private parsePublicUrl(publicUrl: string): { host: string; bucketPath: string } {
    const hasServicePath = publicUrl.includes(':service_path');
    const url = new URL(this.resolvePublicUrl(publicUrl).replace(':path', ''));
    const pathParts = url.pathname.split('/').filter(Boolean);
    const servicePath = hasServicePath ? pathParts.shift() : null;
    const bucket = pathParts[0] || '';
    return { host: url.host, bucketPath: servicePath ? `/${servicePath}/${bucket}` : `/${bucket}` };
  }

  private toAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  private toDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  private hash(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }
}
