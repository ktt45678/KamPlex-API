import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { YoutubeOEmbed } from './interfaces/youtube-oembed.interface';
import { StatusCode } from '../../../enums';

@Injectable()
export class YoutubeService {
  constructor(private httpService: HttpService) { }

  async getVideoInfo(url: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<YoutubeOEmbed>('https://www.youtube.com/oembed', { params: { url, format: 'json' } }));
      return response.data;
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }
}
