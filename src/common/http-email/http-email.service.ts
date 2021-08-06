import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class HttpEmailService {
  constructor(private httpService: HttpService) { }

  sendEmailMailgun(email: string, name: string, subject: string, template: string, params: any) {
    const config: AxiosRequestConfig = {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      auth: { username: 'api', password: process.env.MAILGUN_API }
    };
    const data = new URLSearchParams();
    data.append('from', `${process.env.EMAIL_SENDER} <${process.env.EMAIL_FROM}>`);
    data.append('to', `${name} <${email}>`);
    data.append('subject', subject);
    data.append('template', template);
    Object.keys(params).forEach(p => {
      data.append(`v:${p}`, params[p]);
    });
    return firstValueFrom(this.httpService.post(process.env.MAILGUN_URL, data, config));
  }

  sendEmailSIB(email: string, name: string, templateId: number, params: any) {
    const headers = { 'api-key': process.env.SENDINBLUE_API };
    const data = {
      templateId,
      params,
      to: [{ email, name }]
    };
    return firstValueFrom(this.httpService.post(process.env.SENDINBLUE_URL, data, { headers }));
  }
}
