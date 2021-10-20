import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AuthModule } from '../auth/auth.module';
import { LocalCacheModule } from '../../common/local-cache/local-cache.module';
import { Setting, SettingSchema } from '../../schemas/setting.schema';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { ExternalStoragesModule } from '../external-storages/external-storages.module';

@Module({
  imports: [
    forwardRef(() => ExternalStoragesModule),
    AuthModule,
    LocalCacheModule,
    MongooseModule.forFeature([{ name: Setting.name, schema: SettingSchema, }], MongooseConnection.DATABASE_A),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule { }
