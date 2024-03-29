import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as fs from 'fs';

import { SettingsService } from '../../../resources/settings/settings.service';
import { ExternalStoragesService } from '../../../resources/external-storages/external-storages.service';
import { ExternalStorage } from '../../../resources/external-storages';
import { ImgurUploadResponse } from './interfaces/imgur-upload-response.interface';
import { StatusCode } from '../../../enums';

@Injectable()
export class ImgurService {
  constructor(private httpService: HttpService, private settingsService: SettingsService,
    private externalStoragesService: ExternalStoragesService) { }

  private baseUrl = 'https://api.imgur.com';

  private async refreshToken(storage: ExternalStorage) {
    const data = new URLSearchParams();
    data.append('refresh_token', storage.refreshToken);
    data.append('client_id', storage.clientId);
    data.append('client_secret', storage.clientSecret);
    data.append('grant_type', 'refresh_token');
    try {
      const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/oauth2/token`, data));
      const { access_token, refresh_token } = response.data;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      storage.accessToken = access_token;
      storage.refreshToken = refresh_token;
      storage.expiry = expiry;
      await Promise.all([
        this.settingsService.clearMediaBackdropCache(),
        this.settingsService.clearMediaPosterCache()
      ]);
      return this.externalStoragesService.updateToken(storage._id, access_token, expiry, refresh_token);
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.toJSON());
        if (!e.response)
          throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received an unknown error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
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
    const storage = await this.settingsService.findMediaBackdropStorage();
    await this.checkStorage(storage);
    return this.uploadImage(filePath, fileName, storage);
  }

  async uploadStill(filePath: string, fileName: string) {
    const storage = await this.settingsService.findTVEpisodeStillStorage();
    await this.checkStorage(storage);
    return this.uploadImage(filePath, fileName, storage);
  }

  private async checkStorage(storage: ExternalStorage) {
    if (!storage.accessToken || storage.expiry < new Date())
      await this.refreshToken(storage);
  }

  private async uploadImage(filePath: string, fileName: string, storage: ExternalStorage, retry: number = 5, retryTimeout: number = 0) {
    for (let i = 0; i < retry; i++) {
      let file: string | fs.ReadStream;
      if (filePath.match(/^https?:\/\/.+\/.+$/))
        file = filePath;
      else
        file = fs.createReadStream(filePath);
      const data = new FormData();
      data.append('image', file);
      data.append('name', fileName);
      storage.folderId && data.append('album', storage.folderId);
      try {
        const response = await firstValueFrom(this.httpService.post<ImgurUploadResponse>(`${this.baseUrl}/3/image`, data, { headers: { ...data.getHeaders(), 'Authorization': `Bearer ${storage.accessToken}` } }));
        response.data.data.storage = storage._id;
        return response.data.data;
      } catch (e) {
        if (e.isAxiosError && e.response) {
          if (e.response.status === 401 && i < 1)
            storage = await this.refreshToken(storage);
          else if (e.response.status === 409)
            throw new HttpException({ code: StatusCode.THRID_PARTY_RATE_LIMIT, message: 'Rate limit from third party api, please try again in 1 hour' }, HttpStatus.SERVICE_UNAVAILABLE);
          else if (i < retry - 1)
            new Promise(r => setTimeout(r, retryTimeout));
          else {
            console.error(e.toJSON());
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        } else {
          throw e;
        }
      } finally {
        if (file instanceof fs.ReadStream)
          file.destroy();
      }
    }
  }

  async getStorageAndDeleteImage(id: string, storageId: bigint) {
    const storage = await this.externalStoragesService.findStorageById(storageId);
    return this.deleteImage(id, storage);
  }

  async deleteImage(id: string, storage: ExternalStorage, retry: number = 5, retryTimeout: number = 3000) {
    await this.externalStoragesService.decryptToken(storage);
    await this.checkStorage(storage);
    for (let i = 0; i < retry; i++) {
      try {
        const response = await firstValueFrom(this.httpService.delete(`${this.baseUrl}/3/image/${id}`, { headers: { 'Authorization': `Bearer ${storage.accessToken}` } }));
        return response.data;
      } catch (e) {
        if (e.isAxiosError && e.response) {
          if (e.response.status === 401 && i < 1)
            storage = await this.refreshToken(storage);
          else if (e.response.status === 404)
            return;
          else if (i < retry - 1)
            new Promise(r => setTimeout(r, retryTimeout));
          else {
            console.error(e.toJSON());
            throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
          }
        } else {
          throw e;
        }
      }
    }
  }
}
