import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import fs from 'fs';
import { firstValueFrom } from 'rxjs';

import { StatusCode } from '../../../enums';

@Injectable()
export class CloudflareR2Service {
  cachedSignatureKey: Buffer | null = null;
  cachedSignatureDate: string | null = null;

  constructor(private httpService: HttpService, private configService: ConfigService) { }

  async upload(container: string, filename: string, filePath: string, mimeType: string) {
    const apiUrl = this.configService.get<string>('CLOUDFLARE_R2_API_URL');
    const s3Key = this.configService.get<string>('CLOUDFLARE_R2_S3_KEY');
    const fullPath = `${container}/${filename}`;
    const authorizationHeader = this.getAuthorizationHeader(s3Key, apiUrl, fullPath, 'PUT');
    const fileInfo = await fs.promises.stat(filePath);
    const stream = fs.createReadStream(filePath);
    try {
      await firstValueFrom(this.httpService.put(`${apiUrl}/${fullPath}`, stream, {
        headers: {
          ...authorizationHeader,
          'Content-Type': mimeType,
          'Content-Length': fileInfo.size
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        responseType: 'json'
      }));
      return fileInfo;
    } catch (e) {
      console.error(e.response);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    } finally {
      stream.destroy();
    }
  }

  async delete(container: string, filename: string) {
    const apiUrl = this.configService.get<string>('CLOUDFLARE_R2_API_URL');
    const s3Key = this.configService.get<string>('CLOUDFLARE_R2_S3_KEY');
    const fullPath = `${container}/${filename}`;
    const authorizationHeader = this.getAuthorizationHeader(s3Key, apiUrl, fullPath, 'DELETE');
    try {
      const response = await firstValueFrom(this.httpService.delete(`${apiUrl}/${fullPath}`, {
        headers: {
          ...authorizationHeader
        }
      }));
      return response.data;
    } catch (e) {
      console.error(e.response);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private getSignatureKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string) {
    // Load from cache
    if (this.cachedSignatureKey !== null && this.cachedSignatureDate === dateStamp)
      return this.cachedSignatureKey;
    const kDate = crypto.createHmac('sha256', 'AWS4' + secretKey).update(dateStamp, 'utf8').digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName, 'utf8').digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName, 'utf8').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
    // Save to cache
    this.cachedSignatureKey = kSigning;
    this.cachedSignatureDate = dateStamp;
    return kSigning;
  }

  private getAuthorizationHeader(credential: string, url: string, key: string, method: string) {
    const credentialSplit = credential.split(':');
    const accessKey = credentialSplit[0];
    const secretKey = credentialSplit[1];
    const bucket = url.substring(url.lastIndexOf('/') + 1);
    const region = 'auto';
    const algorithm = 'AWS4-HMAC-SHA256';
    const service = 's3';
    const host = new URL(url).hostname;
    const path = encodeURI(decodeURI(key));
    const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const amzDate = date.substring(0, 8) + 'T' + date.substring(9, 15) + 'Z';
    const credentialScope = `${date.substring(0, 8)}/${region}/${service}/aws4_request`;

    const canonicalRequest = `${method}\n/${bucket}/${path}\n\nhost:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n\nhost;x-amz-content-sha256;x-amz-date\nUNSIGNED-PAYLOAD`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    const signingKey = this.getSignatureKey(secretKey, date.substring(0, 8), region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    return {
      'Authorization': authorizationHeader,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD'
    };
  }

}
