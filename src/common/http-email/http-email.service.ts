import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

import { StatusCode } from '../../enums/status-code.enum';

@Injectable()
export class HttpEmailService {
  constructor(private httpService: HttpService) { }

  async sendEmailMailgun(email: string, name: string, subject: string, template: string, params: any) {
    const config: AxiosRequestConfig = {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      auth: { username: 'api', password: process.env.MAILGUN_API_KEY }
    };
    const data = new URLSearchParams();
    data.append('from', `${process.env.EMAIL_SENDER} <${process.env.EMAIL_FROM}>`);
    data.append('to', `${name} <${email}>`);
    data.append('subject', subject);
    data.append('template', template);
    Object.keys(params).forEach(p => {
      data.append(`v:${p}`, params[p]);
    });
    try {
      const response = await firstValueFrom(this.httpService.post('https://api.mailgun.net/v3/whitefoo.me/messages', data, config));
      return response.data;
    } catch (e) {
      console.error(e.response);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async sendEmailSIB(email: string, name: string, templateId: number, params: any) {
    const headers = { 'api-key': process.env.SENDINBLUE_API_KEY };
    const data = {
      templateId,
      params,
      to: [{ email, name }]
    };
    try {
      const response = await firstValueFrom(this.httpService.post('https://api.sendinblue.com/v3/smtp/email', data, { headers }));
      return response.data;
    } catch (e) {
      console.error(e.response);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async sendEmailSendGrid(email: string, name: string, templateId: string, params: any) {
    const headers = { 'authorization': `Bearer ${process.env.SENDGRID_API_KEY}` };
    const data = {
      from: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_SENDER },
      template_id: templateId,
      dynamic_template_data: params,
      personalizations: [{ to: [{ email, name }] }]
    };
    try {
      const response = await firstValueFrom(this.httpService.post('https://api.sendgrid.com/v3', data, { headers }));
      return response.data;
    } catch (e) {
      console.error(e.response);
      throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
