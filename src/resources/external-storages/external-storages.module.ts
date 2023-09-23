import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ExternalStoragesService } from './external-storages.service';
import { ExternalStoragesController } from './external-storages.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SettingsModule } from '../settings/settings.module';
import { ExternalStorage, ExternalStorageSchema } from '../../schemas';
import { OnedriveModule } from '../../common/modules/onedrive/onedrive.module';
import { ExtStorageNameExistConstraint } from '../../decorators/extstorage-name-exist.decorator';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => OnedriveModule),
    AuditLogModule,
    MongooseModule.forFeature([{ name: ExternalStorage.name, schema: ExternalStorageSchema, }], MongooseConnection.DATABASE_A),
  ],
  controllers: [ExternalStoragesController],
  providers: [
    ExternalStoragesService,
    ExtStorageNameExistConstraint
  ],
  exports: [ExternalStoragesService]
})
export class ExternalStoragesModule { }
