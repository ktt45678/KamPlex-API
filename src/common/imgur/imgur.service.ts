import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import * as fs from 'fs';

import { SettingsService } from '../../resources/settings/settings.service';
import { ExternalStoragesService } from '../../resources/external-storages/external-storages.service';
import { StatusCode } from '../../enums/status-code.enum';
import { ExternalStorage } from '../../schemas/external-storage.schema';

@Injectable()
export class ImgurService {
  constructor(private httpService: HttpService, private settingsService: SettingsService, private externalStoragesService: ExternalStoragesService) { }

  private async refreshToken(storage: ExternalStorage) {
    const data = new URLSearchParams();
    data.append('refresh_token', storage.refreshToken);
    data.append('client_id', process.env.IMGUR_CLIENT_ID);
    data.append('client_secret', process.env.IMGUR_CLIENT_SECRET);
    data.append('grant_type', 'refresh_token');
    try {
      const response = await firstValueFrom(this.httpService.post('oauth2/token', data));
      const { access_token, refresh_token } = response.data;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      storage.accessToken = access_token;
      storage.refreshToken = refresh_token;
      storage.expiresAt = expiresAt;
      return this.externalStoragesService.updateToken(storage._id, access_token, refresh_token, expiresAt);
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async uploadPoster(filePath: string, fileName: string) {
    const storage = await this.settingsService.findMediaPosterStorage();
    await this.checkStorage(storage);
    return this.uploadImage(filePath, fileName, storage);
  }

  async uploadBackdrop(filePath: string, fileName: string) {
    const storage = await this.settingsService.findMediaPosterStorage();
    await this.checkStorage(storage);
    return this.uploadImage(filePath, fileName, storage);
  }

  private async checkStorage(storage: ExternalStorage) {
    if (!storage.accessToken || storage.expiresAt < new Date())
      await this.refreshToken(storage);
  }

  private async uploadImage(filePath: string, fileName: string, storage: ExternalStorage) {
    let file: string | fs.ReadStream;
    if (filePath.match(/^https?:\/\/.+\/.+$/))
      file = filePath;
    else
      file = fs.createReadStream(filePath);
    const data = new FormData();
    data.append('image', file);
    data.append('name', fileName);
    data.append('album', storage.folderId);
    for (let i = 0; i < 2; i++) {
      console.log('loop ' + i);
      try {
        const response = await firstValueFrom(this.httpService.post('3/image', data, { headers: { ...data.getHeaders(), 'Authorization': `Bearer ${storage.accessToken}` } }));
        return response.data.data;
      } catch (e) {
        if (e.isAxiosError) {
          if (e.response.status === 401 && i < 1)
            storage = await this.refreshToken(storage);
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

  async deletePoster(url: string) {
    const storage = await this.settingsService.findMediaPosterStorage();
    await this.checkStorage(storage);
    return this.deleteImage(url, storage);
  }

  async deleteBackdrop(url: string) {
    const storage = await this.settingsService.findMediaBackdropStorage();
    await this.checkStorage(storage);
    return this.deleteImage(url, storage);
  }

  private async deleteImage(url: string, storage: ExternalStorage) {
    const imageHash = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
    for (let i = 0; i < 2; i++) {
      try {
        const response = await firstValueFrom(this.httpService.delete(`3/image/${imageHash}`, { headers: { 'Authorization': `Bearer ${storage.accessToken}` } }));
        return response.data;
      } catch (e) {
        if (e.isAxiosError) {
          if (e.response.status === 401 && i < 1)
            storage = await this.refreshToken(storage);
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
