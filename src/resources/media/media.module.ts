import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Media, MediaSchema } from '../../schemas/media.schema';
import { MediaStorage, MediaStorageSchema } from '../../schemas/media-storage.schema';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ImgurModule } from '../../common/imgur/imgur.module';
import { DropboxModule } from '../../common/dropbox/dropbox.module';
import { GoogleDriveModule } from '../../common/google-drive/google-drive.module';
import { MongooseConnection } from 'src/enums/mongoose-connection.enum';
import { AuthModule } from '../auth/auth.module';
import { GenresModule } from '../genres/genres.module';
import { ProducersModule } from '../producers/producers.module';
import { ExternalStoragesModule } from '../external-storages/external-storages.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => GenresModule),
    forwardRef(() => ProducersModule),
    DropboxModule,
    ImgurModule,
    GoogleDriveModule,
    ExternalStoragesModule,
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }], MongooseConnection.DATABASE_A),
    MongooseModule.forFeature([{ name: MediaStorage.name, schema: MediaStorageSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService]
})
export class MediaModule { }
