import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { DriveFile } from './interfaces/drive-file.interface';
import { DriveFileList } from './interfaces/drive-file-list.interface';
import { SettingsService } from '../../resources/settings/settings.service';
import { ExternalStoragesService } from '../../resources/external-storages/external-storages.service';
import { StatusCode } from '../../enums/status-code.enum';
import { ExternalStorage } from '../../resources/external-storages/entities/external-storage.entity';

@Injectable()
export class GoogleDriveService {
  constructor(private httpService: HttpService, private settingsService: SettingsService, private externalStoragesService: ExternalStoragesService) { }

  private async refreshToken(storage: ExternalStorage) {
    const data = new URLSearchParams();
    data.append('client_id', process.env.GDRIVE_CLIENT_ID);
    data.append('client_secret', process.env.GDRIVE_CLIENT_SECRET);
    data.append('refresh_token', storage.refreshToken);
    data.append('grant_type', 'refresh_token');
    try {
      const response = await firstValueFrom(this.httpService.post('oauth2/v4/token', data));
      const { access_token, expires_in } = response.data;
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in - 30);
      storage.accessToken = access_token;
      storage.expiresAt = expiresAt;
      await this.settingsService.clearMediaSourceCache();
      return this.externalStoragesService.updateToken(storage._id, access_token, expiresAt);
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async createFolder(name: string) {
    const storage = await this.settingsService.findMediaSourceStorage();
    if (!storage.accessToken || storage.expiresAt < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post<DriveFile>('drive/v3/files', {
          mimeType: 'application/vnd.google-apps.folder',
          name,
          parents: [storage.folderId]
        }, {
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

  async createUploadSession(name: string, folder: string) {
    const storage = await this.settingsService.findMediaSourceStorage();
    if (!storage.accessToken || storage.expiresAt < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post('upload/drive/v3/files', {
          name,
          parents: [folder]
        }, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: { supportsAllDrives: true, uploadType: 'resumable' }
        }));
        return response.headers;
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

  async deleteFolder(folder: string) {
    const storage = await this.settingsService.findMediaSourceStorage();
    if (!storage.accessToken || storage.expiresAt < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < 2; i++) {
      try {
        const listResponse = await firstValueFrom(this.httpService.get<DriveFileList>('drive/v3/files', {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: {
            corpora: 'allDrives',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            q: `mimeType = 'application/vnd.google-apps.folder' and '${storage.folderId}' in parents and name = '${folder}'`
          }
        }));
        const folderInfo = listResponse.data.files[0];
        if (!folderInfo)
          return folderInfo;
        const deleteResponse = await firstValueFrom(this.httpService.delete(`drive/v3/files/${folderInfo.id}`, {
          headers: { 'Authorization': `Bearer ${storage.accessToken}`, 'Content-Type': 'application/json' },
          params: { supportsAllDrives: true }
        }));
        return deleteResponse.data;
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
}
