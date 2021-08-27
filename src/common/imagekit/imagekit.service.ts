import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';

import { StatusCode } from '../../enums/status-code.enum';

@Injectable()
export class ImagekitService {
  constructor(private httpService: HttpService) { }

  async upload(filePath: string, fileName: string, folder: string) {
    const data = new FormData();
    const stream = fs.createReadStream(filePath);
    data.append('file', stream);
    data.append('fileName', fileName);
    data.append('folder', folder);
    data.append('useUniqueFileName', 'false');
    const config: AxiosRequestConfig = {
      headers: data.getHeaders(),
      auth: { username: process.env.IMAGEKIT_API_KEY, password: '' }
    };
    try {
      const response = await firstValueFrom(this.httpService.post('https://upload.imagekit.io/api/v1/files/upload', data, config));
      return response.data;
    } catch (e) {
      console.error(e.response);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async deleteFolder(folderPath: string) {
    const config: AxiosRequestConfig = {
      auth: { username: process.env.IMAGEKIT_API_KEY, password: '' },
      data: { folderPath }
    };
    try {
      const response = await firstValueFrom(this.httpService.delete('https://api.imagekit.io/v1/folder', config));
      return response.data;
    } catch (e) {
      if (e.response.data.reason === 'FOLDER_NOT_FOUND')
        return;
      console.error(e.response);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
