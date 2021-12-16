import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';

import { DropboxFile } from './entities/dropbox-file.entity';
import { SettingsService } from '../../resources/settings/settings.service';
import { ExternalStoragesService } from '../../resources/external-storages/external-storages.service';
import { StatusCode } from '../../enums/status-code.enum';
import { ExternalStorage } from '../../resources/external-storages/entities/external-storage.entity';

@Injectable()
export class DropboxService {
  constructor(private httpService: HttpService, private settingsService: SettingsService, private externalStoragesService: ExternalStoragesService,
    private configService: ConfigService) { }

  private async refreshToken(storage: ExternalStorage) {
    const data = new URLSearchParams();
    data.append('refresh_token', storage.refreshToken);
    data.append('client_id', this.configService.get('DROPBOX_CLIENT_ID'));
    data.append('client_secret', this.configService.get('DROPBOX_CLIENT_SECRET'));
    data.append('grant_type', 'refresh_token');
    try {
      const response = await firstValueFrom(this.httpService.post('https://api.dropboxapi.com/oauth2/token', data, {
        headers: {
          'Accept': 'application/json'
        }
      }));
      const { access_token, expires_in } = response.data;
      const expiry = new Date();
      expiry.setSeconds(expiry.getSeconds() + expires_in - 30);
      storage.accessToken = access_token;
      storage.expiry = expiry;
      await this.settingsService.clearMediaSubtitleCache();
      return this.externalStoragesService.updateToken(storage._id, access_token, expiry);
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async uploadSubtitle(filePath: string, fileName: string) {
    const storage = await this.settingsService.findMediaSubtitleStorage();
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    const file = fs.createReadStream(filePath);
    const path = storage.folderId ? `/${storage.folderId}/${fileName}` : `/${fileName}`;
    const dropboxArg = JSON.stringify({
      path: path,
      mode: 'add',
      autorename: true,
      mute: false
    });
    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post('https://content.dropboxapi.com/2/files/upload', file, {
          headers: {
            'Authorization': `Bearer ${storage.accessToken}`,
            'Dropbox-API-Arg': dropboxArg,
            'Accept': 'application/json',
            'Content-Type': 'text/plain; charset=dropbox-cors-hack'
          }
        }));
        const responseLink = await firstValueFrom(this.httpService.post('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
          path: response.data.path_display,
          settings: {
            audience: 'public',
            access: 'viewer',
            allow_download: true
          }
        }, {
          headers: {
            'Authorization': `Bearer ${storage.accessToken}`
          }
        }));
        return new DropboxFile(responseLink.data, storage._id);
      } catch (e) {
        if (e.isAxiosError && e.response) {
          if (e.response.status === 401 && i < 1)
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

  async getStorageAndDeleteSubtitle(folder: string, storageId: string) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    return this.deleteSubtitleFolder(folder, storage);
  }

  async deleteSubtitleFolder(folder: string, storage: ExternalStorage, retry: number = 5, retryTimeout: number = 3000) {
    await this.externalStoragesService.decryptToken(storage);
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
    const path = storage.folderId ? `/${storage.folderId}/${folder}` : `/${folder}`;
    for (let i = 0; i < retry; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post('https://api.dropboxapi.com/2/files/delete_v2', {
          path: path
        }, {
          headers: {
            'Authorization': `Bearer ${storage.accessToken}`,
            'Accept': 'application/json'
          }
        }));
        return response.data;
      } catch (e) {
        if (e.isAxiosError && e.response) {
          if (e.response.status === 401 && i < 1)
            await this.refreshToken(storage);
          // The folder has already been deleted
          else if (e.response.status === 409)
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
}
