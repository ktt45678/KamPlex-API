import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import path from 'path';

import { StatusCode } from '../../../enums';
import { ExternalStorage } from '../../../resources/external-storages';
import { ExternalStoragesService } from '../../../resources/external-storages/external-storages.service';
import { SettingsService } from '../../../resources/settings/settings.service';
import { UploadSession } from '../onedrive/interfaces/upload-session.interface';

@Injectable()
export class FilerService {
  constructor(private httpService: HttpService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => SettingsService)) private settingsService: SettingsService,
    @Inject(forwardRef(() => ExternalStoragesService)) private externalStoragesService: ExternalStoragesService) { }

  async refreshToken(storage: ExternalStorage) {
    const expiresIn = 4 * 60 * 60;
    const token = await this.jwtService.signAsync({}, { secret: storage.clientSecret, expiresIn });
    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + expiresIn - 300);
    storage.accessToken = token;
    storage.expiry = expiry;
    await this.settingsService.clearMediaSourceCache();
    return this.externalStoragesService.updateToken(storage._id, token, expiry);
  }

  async findInStorages(filePath: string, storages: ExternalStorage[], retry: number = 3, retryTimeout: number = 0) {
    for (let i = 0; i < storages.length; i++) {
      const storage = storages[i];
      await this.externalStoragesService.decryptToken(storage);
      for (let j = 0; j < retry; j++) {
        try {
          const fileInfo = await this.getFileInfo(storage, filePath);
          return { storage: storage, file: { id: filePath, name: filePath.split('/').pop(), size: fileInfo.FileSize, file: { mimeType: fileInfo.Mime } } };
        } catch (e) {
          if (j < retry - 1)
            await new Promise(r => setTimeout(r, retryTimeout));
          else if (e.response?.status === 404)
            break;
          else {
            console.error(e.response);
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        }
      }
    }
    return null;
  }

  async findPath(path: string, storageId: bigint, retry: number = 3, retryTimeout: number = 0) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const fileInfo = await this.getFileInfo(storage, path);
        return { id: path, name: path.split('/').pop(), size: fileInfo.FileSize, file: { mimeType: fileInfo.Mime } };
      } catch (e) {
        if (e.response?.status === 401 && i < 1) {
          await this.refreshToken(storage);
        } else if (i < retry - 1) {
          await new Promise(r => setTimeout(r, retryTimeout));
        } else {
          console.error(e.response);
          throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
        }
      }
    }
  }

  async findId(fileId: string, storage: ExternalStorage, retry: number = 3, retryTimeout: number = 0) {
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const fileInfo = await this.getFileInfo(storage, fileId);
        return { id: fileId, name: fileInfo.FullPath.split('/').pop(), size: fileInfo.FileSize, file: { mimeType: fileInfo.Mime } };
      } catch (e) {
        if (e.response?.status === 404)
          throw new HttpException({ code: StatusCode.DRIVE_FILE_NOT_FOUND, message: 'File not found' }, HttpStatus.NOT_FOUND);
        if (e.response?.status === 401 && i < 1) {
          await this.refreshToken(storage);
        } else if (i < retry - 1) {
          await new Promise(r => setTimeout(r, retryTimeout));
        } else {
          console.error(e.response);
          throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
        }
      }
    }
  }

  async deleteFolder(folder: bigint | string, storage: ExternalStorage, retry: number = 5, retryTimeout: number = 3000) {
    const path = folder.toString();
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);

    for (let i = 0; i < retry; i++) {
      try {
        const url = this.buildUrl(storage, path);
        await firstValueFrom(this.httpService.delete(url, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}` },
          params: { recursive: 'true' }
        }));
        return;
      } catch (e) {
        if (e.response?.status === 404)
          return;
        if (e.response?.status === 401 && i < 1) {
          await this.refreshToken(storage);
        } else if (i < retry - 1) {
          await new Promise(r => setTimeout(r, retryTimeout));
        } else {
          console.error(e.response);
          throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
        }
      }
    }
  }

  async createUploadSession(name: string, folderId: string, size: number, mimeType: string) {
    const storage = await this.settingsService.findMediaSourceStorage();
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);

    const filePath = path.posix.join(folderId || '', name).replace(/^\/+/, '');
    const url = this.buildUrl(storage, filePath, 'tus');

    const filenameBase64 = Buffer.from(name).toString('base64');
    const filetypeBase64 = Buffer.from(mimeType).toString('base64');

    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post(url, null, {
          headers: {
            'Authorization': `Bearer ${storage.accessToken}`,
            'Tus-Resumable': '1.0.0',
            'Upload-Length': size.toString(),
            'Upload-Metadata': `filename ${filenameBase64},filetype ${filetypeBase64}`
          }
        }));
        const locationUrl = response.headers['location'];
        if (!locationUrl) {
          throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: 'Failed to create upload session' }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const uploadToken = await this.jwtService.signAsync({ allowed_prefixes: ['/.tus/.uploads/'], allowed_methods: ['HEAD', 'PATCH'] }, { secret: storage.clientSecret, expiresIn: '7d' });
        const sessionLocationUrl = new URL(locationUrl);
        sessionLocationUrl.searchParams.set('jwt', uploadToken);
        sessionLocationUrl.searchParams.set('filePath', filePath);
        sessionLocationUrl.searchParams.set('protocol', 'tus');
        const uploadSession: UploadSession = {
          url: sessionLocationUrl.toString(),
          storage: storage._id
        };
        return uploadSession;
      } catch (e) {
        if (e.isAxiosError) {
          if (!e.response) {
            console.error(e);
            if (i < 1) continue;
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: e.message }, HttpStatus.SERVICE_UNAVAILABLE);
          }
          if (e.response.status === 401 && i < 1) {
            await this.refreshToken(storage);
          } else {
            console.error(e.response);
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from Filer API` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        } else {
          console.error(e);
          throw e;
        }
      }
    }
  }

  private async getFileInfo(storage: ExternalStorage, filePath: string) {
    const url = this.buildUrl(storage, filePath);
    const response = await firstValueFrom(this.httpService.get<FilerFileInfo>(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${storage.accessToken}`
      },
      params: { metadata: 'true' }
    }));
    return response.data;
  }

  resolvePublicUrl(url: string, type: 'standard' | 'tus' = 'standard') {
    const servicePath = type === 'tus' ? 'filer/.tus/buckets' : 'filer/buckets';
    return url.replace(':service_path', servicePath);
  }

  private buildUrl(storage: ExternalStorage, filePath: string, type: 'standard' | 'tus' = 'standard') {
    const cleanPath = filePath.replace(/^\//, '');
    const fullPath = path.posix.join(storage.folderId || '', cleanPath);
    const resolvedUrl = this.resolvePublicUrl(storage.publicUrl, type);
    return resolvedUrl.replace(':path', fullPath);
  }
}

interface FilerFileInfo {
  FullPath: string;
  FileSize: number;
  Mime: string;
  Crtime: string;
  Mtime: string;
  TtlSec: number;
  UserName: string;
  GroupNames: string[] | null;
  SymlinkTarget: string;
  Md5: string;
  Chunks: any[];
}
