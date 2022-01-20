import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

import { DriveFile } from './interfaces/drive-file.interface';
import { DriveFileList } from './interfaces/drive-file-list.interface';
import { UploadSession } from './interfaces/upload-session.interface';
import { SettingsService } from '../../resources/settings/settings.service';
import { ExternalStoragesService } from '../../resources/external-storages/external-storages.service';
import { ExternalStorage } from '../../resources/external-storages/entities/external-storage.entity';
import { StatusCode } from '../../enums';

@Injectable()
export class GoogleDriveService {
  constructor(private httpService: HttpService, private settingsService: SettingsService, private externalStoragesService: ExternalStoragesService,
    private configService: ConfigService) { }

  private baseUrl = 'https://www.googleapis.com';

  private async refreshToken(storage: ExternalStorage) {
    const data = new URLSearchParams();
    data.append('client_id', this.configService.get('GDRIVE_CLIENT_ID'));
    data.append('client_secret', this.configService.get('GDRIVE_CLIENT_SECRET'));
    data.append('refresh_token', storage.refreshToken);
    data.append('grant_type', 'refresh_token');
    try {
      const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/oauth2/v4/token`, data));
      const { access_token, expires_in } = response.data;
      const expiry = new Date();
      expiry.setSeconds(expiry.getSeconds() + expires_in - 30);
      storage.accessToken = access_token;
      storage.expiry = expiry;
      await this.settingsService.clearMediaSourceCache();
      return this.externalStoragesService.updateToken(storage._id, access_token, expiry);
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
    const folder = await this.createFolder(folderName, storage);
    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/upload/drive/v3/files`, {
          name,
          parents: [folder.id]
        }, {
          headers: {
            'Authorization': `Bearer ${storage.accessToken}`,
            'Content-Type': 'application/json',
            'Origin': this.configService.get('ORIGIN_URL')
          },
          params: { supportsAllDrives: true, uploadType: 'resumable' }
        }));
        const uploadSession: UploadSession = {
          url: response.headers.location,
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

  async getStorageAndDeleteFolder(folder: string, storageId: string) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    return this.deleteFolder(folder, storage);
  }

  async deleteFolder(folder: string, storage: ExternalStorage, retry: number = 5, retryTimeout: number = 3000) {
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    const params = {
      corpora: 'allDrives',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id)',
      q: storage.folderId ?
        `mimeType = 'application/vnd.google-apps.folder' and '${storage.folderId}' in parents and name = '${folder}' and trashed = false` :
        `mimeType = 'application/vnd.google-apps.folder' and name = '${folder}' and trashed = false`
    };
    for (let i = 0; i < retry; i++) {
      try {
        const listResponse = await firstValueFrom(this.httpService.get<DriveFileList>(`${this.baseUrl}/drive/v3/files`, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: params
        }));
        const folderInfo = listResponse.data.files[0];
        if (!folderInfo)
          return folderInfo;
        const deleteResponse = await firstValueFrom(this.httpService.delete(`${this.baseUrl}/drive/v3/files/${folderInfo.id}`, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: { supportsAllDrives: true }
        }));
        return deleteResponse.data;
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

  private async createFolder(name: string, storage: ExternalStorage) {
    for (let i = 0; i < 2; i++) {
      try {
        const data: any = {
          mimeType: 'application/vnd.google-apps.folder',
          name
        };
        storage.folderId && (data.parents = [storage.folderId]);
        const response = await firstValueFrom(this.httpService.post<DriveFile>(`${this.baseUrl}/drive/v3/files`, data, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: { supportsAllDrives: true }
        }));
        return response.data;
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

  async findPath(path: string, storageId: string, retry: number = 5, retryTimeout: number = 0) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const dirs = path.split('/');
        let response: AxiosResponse<DriveFileList>;
        let parentId = storage.folderId;
        for (let j = 0; j < dirs.length; j++) {
          const childName = dirs[j].replace(/\'/g, `\\'`);
          const params = {
            corpora: 'allDrives',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            fields: 'files(id,mimeType,size)',
            q: parentId ?
              `'${parentId}' in parents and name = '${childName}' and trashed = false` :
              `name = '${childName}' and trashed = false`
          };
          response = await firstValueFrom(this.httpService.get<DriveFileList>(`${this.baseUrl}/drive/v3/files`, {
            headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
            params: params
          }));
          if (j < dirs.length - 1) {
            if (!response.data.files.length)
              return null;
            parentId = response.data.files[0].id;
          }
        }
        const fileInfo = response.data.files[0];
        return fileInfo;
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
        const response = await firstValueFrom(this.httpService.get<DriveFile>(`${this.baseUrl}/drive/v3/files/${fileId}`, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: {
            supportsAllDrives: true,
            fields: 'kind,id,name,mimeType,teamDriveId,driveId,size,trashed'
          }
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
