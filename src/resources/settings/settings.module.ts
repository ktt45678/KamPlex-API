import { forwardRef, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { LocalCacheModule } from '../../common/local-cache/local-cache.module';
import { Setting, SettingSchema } from '../../schemas/setting.schema';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    LocalCacheModule,
    MongooseModule.forFeature([{ name: Setting.name, schema: SettingSchema }])
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule { }
