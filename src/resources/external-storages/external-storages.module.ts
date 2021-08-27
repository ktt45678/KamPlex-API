import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ExternalStoragesService } from './external-storages.service';
import { ExternalStoragesController } from './external-storages.controller';
import { ExternalStorage, ExternalStorageSchema } from '../../schemas/external-storage.schema';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { AuthModule } from '../auth/auth.module';
import { ExtStorageNameExistConstraint } from '../../decorators/extstorage-name-exist.decorator';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => SettingsModule),
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
