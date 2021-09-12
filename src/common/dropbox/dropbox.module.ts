import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExternalStoragesModule } from '../../resources/external-storages/external-storages.module';
import { SettingsModule } from '../../resources/settings/settings.module';
import { DropboxService } from './dropbox.service';

@Module({
  imports: [
    HttpModule,
    SettingsModule,
    ExternalStoragesModule
  ],
  providers: [DropboxService],
  exports: [DropboxService]
})
export class DropboxModule { }
