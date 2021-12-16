import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { Media, MediaSchema } from '../../schemas/media.schema';
import { MediaStorage, MediaStorageSchema } from '../../schemas/media-storage.schema';
import { DriveSession, DriveSessionSchema } from '../../schemas/drive-session.schema';
import { TVEpisode, TVEpisodeSchema } from '../../schemas/tv-episode.schema';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaCosumer } from './media.consumer';
import { ImgurModule } from '../../common/imgur/imgur.module';
import { DropboxModule } from '../../common/dropbox/dropbox.module';
import { GoogleDriveModule } from '../../common/google-drive/google-drive.module';
import { HttpEmailModule } from '../../common/http-email/http-email.module';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { TaskQueue } from '../../enums/task-queue.enum';
import { AuthModule } from '../auth/auth.module';
import { GenresModule } from '../genres/genres.module';
import { ProducersModule } from '../producers/producers.module';
import { HistoryModule } from '../history/history.module';
import { ExternalStoragesModule } from '../external-storages/external-storages.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => GenresModule),
    forwardRef(() => ProducersModule),
    HistoryModule,
    DropboxModule,
    ImgurModule,
    GoogleDriveModule,
    HttpEmailModule,
    ExternalStoragesModule,
    SettingsModule,
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: MediaStorage.name, schema: MediaStorageSchema },
      { name: DriveSession.name, schema: DriveSessionSchema },
      { name: TVEpisode.name, schema: TVEpisodeSchema }
    ], MongooseConnection.DATABASE_A),
    BullModule.registerQueue({
      name: TaskQueue.VIDEO_TRANSCODE,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    })
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaCosumer
  ],
  exports: [MediaService]
})
export class MediaModule { }
