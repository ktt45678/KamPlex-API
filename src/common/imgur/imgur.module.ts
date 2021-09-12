import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExternalStoragesModule } from '../../resources/external-storages/external-storages.module';
import { SettingsModule } from '../../resources/settings/settings.module';
import { ImgurService } from './imgur.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://api.imgur.com/'
    }),
    SettingsModule,
    ExternalStoragesModule
  ],
  providers: [ImgurService],
  exports: [ImgurService]
})
export class ImgurModule { }
