import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ExternalStoragesModule } from '../../../resources/external-storages/external-storages.module';
import { SettingsModule } from '../../../resources/settings/settings.module';
import { OnedriveService } from './onedrive.service';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => SettingsModule),
    forwardRef(() => ExternalStoragesModule)
  ],
  providers: [OnedriveService],
  exports: [OnedriveService]
})
export class OnedriveModule { }
