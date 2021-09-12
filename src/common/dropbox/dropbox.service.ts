import { HttpService } from '@nestjs/axios';
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
  constructor(private httpService: HttpService, private settingsService: SettingsService, private externalStoragesService: ExternalStoragesService) { }

  private async refreshToken(storage: ExternalStorage) {
    const data = new URLSearchParams();
    data.append('refresh_token', storage.refreshToken);
    data.append('client_id', process.env.DROPBOX_CLIENT_ID);
    data.append('client_secret', process.env.DROPBOX_CLIENT_SECRET);
    data.append('grant_type', 'refresh_token');
    try {
      const response = await firstValueFrom(this.httpService.post('https://api.dropboxapi.com/oauth2/token', data, {
        headers: {
          'Accept': 'application/json'
        }
      }));
      const { access_token, expires_in } = response.data;
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in - 30);
      storage.accessToken = access_token;
      storage.expiresAt = expiresAt;
      await this.settingsService.clearMediaSubtitleCache();
      return this.externalStoragesService.updateToken(storage._id, access_token, expiresAt);
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
    if (!storage.accessToken || storage.expiresAt < new Date())
      await this.refreshToken(storage);
    const file = fs.createReadStream(filePath);
    const dropboxArg = JSON.stringify({
      path: `/${storage.folderId}/${fileName}`,
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
        return new DropboxFile(responseLink.data);
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

  async deleteSubtitleFolder(folder: string, storage: ExternalStorage) {
    if (!storage.accessToken || storage.expiresAt < new Date())
      await this.refreshToken(storage);
    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.post('https://api.dropboxapi.com/2/files/delete_v2', {
          path: `/${storage.folderId}/${folder}`
        }, {
          headers: {
            'Authorization': `Bearer ${storage.accessToken}`,
            'Accept': 'application/json'
          }
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
}
