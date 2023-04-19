import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { DriveFile } from './interfaces/drive-file.interface';
import { UploadSession } from './interfaces/upload-session.interface';
import { SettingsService } from '../../../resources/settings/settings.service';
import { ExternalStoragesService } from '../../../resources/external-storages/external-storages.service';
import { ExternalStorage } from '../../../resources/external-storages';
import { StatusCode } from '../../../enums';

@Injectable()
export class OnedriveService {
  constructor(private httpService: HttpService, private settingsService: SettingsService,
    private externalStoragesService: ExternalStoragesService) { }

  private baseUrl = 'https://graph.microsoft.com/v1.0';

  private async refreshToken(storage: ExternalStorage) {
    const data = new URLSearchParams();
    data.append('client_id', storage.clientId);
    data.append('client_secret', storage.clientSecret);
    data.append('refresh_token', storage.refreshToken);
    data.append('grant_type', 'refresh_token');
    try {
      const response = await firstValueFrom(this.httpService.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', data));
      const { access_token, refresh_token, expires_in } = response.data;
      const expiry = new Date();
      expiry.setSeconds(expiry.getSeconds() + expires_in - 30);
      storage.accessToken = access_token;
      storage.refreshToken = refresh_token;
      storage.expiry = expiry;
      await this.settingsService.clearMediaSourceCache();
      return this.externalStoragesService.updateToken(storage._id, access_token, expiry, refresh_token);
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async createUploadSession(name: string, folderName: string) {
    const storage = await this.settingsService.findMediaSourceStorage();
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/me/drive/root:/${folderName}/${name}:/createUploadSession`, {}, {
          headers: {
            'Authorization': `Bearer ${storage.accessToken}`,
            'Content-Type': 'application/json',
            'Origin': '*'
          }
        }));
        const uploadSession: UploadSession = {
          url: response.data.uploadUrl,
          storage: storage._id
        };
        return uploadSession;
      } catch (e) {
        if (e.isAxiosError) {
          if (e.response?.status === 401 && i < 1)
            await this.refreshToken(storage);
          else {
            console.error(e.response);
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        } else {
          throw e;
        }
      }
    }
  }

  async getStorageAndDeleteFolder(folder: bigint | string, storageId: bigint) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    return this.deleteFolder(folder, storage);
  }

  async deleteFolder(folder: bigint | string, storage: ExternalStorage, retry: number = 5, retryTimeout: number = 3000) {
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const response = await firstValueFrom(this.httpService.delete(`${this.baseUrl}/me/drive/root:/${folder}`, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' }
        }));
        return response.data;
      } catch (e) {
        if (e.isAxiosError) {
          if (e.response?.status === 401 && i < 1)
            await this.refreshToken(storage);
          else if (e.response?.status === 404)
            return;
          else if (i < retry - 1)
            await new Promise(r => setTimeout(r, retryTimeout));
          else {
            console.error(e.response);
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        } else {
          throw e;
        }
      }
    }
  }

  async findPath(path: string, storageId: bigint, retry: number = 5, retryTimeout: number = 0) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const response = await firstValueFrom(this.httpService.get<DriveFile>(`${this.baseUrl}/me/drive/root:/${path}`, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: { select: 'id,name,file,parentReference,size' }
        }));
        return response.data;
      } catch (e) {
        if (e.isAxiosError) {
          if (e.response?.status === 401 && i < 1)
            await this.refreshToken(storage);
          else if (i < retry - 1)
            await new Promise(r => setTimeout(r, retryTimeout));
          else {
            console.error(e.response);
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        } else {
          throw e;
        }
      }
    }
  }

  async findId(fileId: string, storage: ExternalStorage, retry: number = 5, retryTimeout: number = 0) {
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const response = await firstValueFrom(this.httpService.get<DriveFile>(`${this.baseUrl}/me/drive/items/${fileId}`, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: { select: 'id,name,file,parentReference,size' }
        }));
        return response.data;
      } catch (e) {
        if (e.isAxiosError) {
          if (e.response?.status === 401 && i < 1)
            await this.refreshToken(storage);
          else if (i < retry - 1)
            await new Promise(r => setTimeout(r, retryTimeout));
          else if (e.response?.status === 404)
            throw new HttpException({ code: StatusCode.DRIVE_FILE_NOT_FOUND, message: 'File not found' }, HttpStatus.NOT_FOUND);
          else {
            console.error(e.response);
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        } else {
          throw e;
        }
      }
    }
  }
}
