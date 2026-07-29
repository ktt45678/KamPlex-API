import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { StatusCode } from '../../../enums';

@Injectable()
export class HttpEmailService {
  constructor(private httpService: HttpService, private configService: ConfigService) { }

  async sendEmailResend(email: string, name: string, templateId: string, variables: Record<string, unknown>) {
    const headers = {
      'Authorization': `Bearer ${this.configService.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    };
    const data = {
      from: `${this.configService.get('EMAIL_SENDER')} <${this.configService.get('EMAIL_FROM')}>`,
      to: `${name} <${email}>`,
      template: {
        id: templateId,
        variables
      }
    };
    try {
      const response = await firstValueFrom(this.httpService.post('https://api.resend.com/emails', data, { headers }));
      return response.data;
    } catch (e) {
      console.error(e.response?.data || e.response);
      throw new HttpException({
        code: StatusCode.THRID_PARTY_REQUEST_FAILED,
        message: `Received ${e.response?.status ?? HttpStatus.SERVICE_UNAVAILABLE} ${e.response?.statusText ?? 'Service Unavailable'} error from third party api`
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
