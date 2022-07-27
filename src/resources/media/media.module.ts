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
import { AzureBlobModule } from '../../common/modules/azure-blob/azure-blob.module';
import { OnedriveModule } from '../../common/modules/onedrive/onedrive.module';
import { ExternalStreamModule } from '../../common/modules/external-stream/external-stream.module';
import { HttpEmailModule } from '../../common/modules/http-email/http-email.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { GenresModule } from '../genres/genres.module';
import { ProducersModule } from '../producers/producers.module';
import { HistoryModule } from '../history/history.module';
import { ExternalStoragesModule } from '../external-storages/external-storages.module';
import { SettingsModule } from '../settings/settings.module';
import { WsAdminModule } from '../ws-admin/ws-admin.module';
import { MongooseConnection, TaskQueue } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => GenresModule),
    forwardRef(() => ProducersModule),
    HistoryModule,
    AzureBlobModule,
    OnedriveModule,
    ExternalStreamModule,
    HttpEmailModule,
    ExternalStoragesModule,
    SettingsModule,
    WsAdminModule,
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: MediaStorage.name, schema: MediaStorageSchema },
      { name: DriveSession.name, schema: DriveSessionSchema },
      { name: TVEpisode.name, schema: TVEpisodeSchema }
    ], MongooseConnection.DATABASE_A),
    BullModule.registerQueue({
      name: TaskQueue.VIDEO_TRANSCODE,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 3
      }
    }, {
      name: TaskQueue.VIDEO_CANCEL,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 3
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
