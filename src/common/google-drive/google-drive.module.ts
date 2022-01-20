import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ExternalStoragesModule } from '../../resources/external-storages/external-storages.module';
import { SettingsModule } from '../../resources/settings/settings.module';
import { GoogleDriveService } from './google-drive.service';

@Module({
  imports: [
    HttpModule,
    SettingsModule,
    ExternalStoragesModule
  ],
  providers: [GoogleDriveService],
  exports: [GoogleDriveService]
})
export class GoogleDriveModule { }
