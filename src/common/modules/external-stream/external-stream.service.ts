import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { FlixHQWatch } from './interfaces';
import { StatusCode } from '../../../enums';

@Injectable()
export class ExternalStreamService {
  constructor(private httpService: HttpService, private configService: ConfigService) { }

  async fetchGogoStreamUrl(id: string) {
    const pair1 = Buffer.from(id).toString('base64');
    const key = Buffer.from(id + 'LTXs3GrU8we9O' + pair1).toString('base64');
    try {
      const response = await firstValueFrom(this.httpService.get('https://animixplay.to/api/live' + key, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        },
        maxRedirects: 0,
        validateStatus(status) {
          return status < 400;
        },
      }));
      const embedUrl = response.headers.location;
      if (!embedUrl) return null;
      const splitEmbedUrl = embedUrl.split('#');
      const decodedUrl = Buffer.from(splitEmbedUrl[1], 'base64').toString('ascii');
      return decodedUrl;
    } catch (e) {
      console.error(e);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async fetchFlixHQStream(mediaId: string, episodeId: string) {
    try {
      const url = this.configService.get<string>('CONSUMET_API_URL') + '/movies/flixhq/watch';
      const response = await firstValueFrom(this.httpService.get<FlixHQWatch>(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        },
        params: { mediaId, episodeId }
      }));
      return response.data;
    } catch (e) {
      console.error(e);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
