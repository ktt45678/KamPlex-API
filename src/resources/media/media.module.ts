import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { Media, MediaSchema, MediaStorage, MediaStorageSchema, DriveSession, DriveSessionSchema, TVEpisode, TVEpisodeSchema } from '../../schemas';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaConsumerAV1, MediaConsumerH264, MediaConsumerH265, MediaConsumerVP9 } from './media.consumer';
import { MediaResultConsumer } from './media-result.consumer';
import { CloudflareR2Module } from '../../common/modules/cloudflare-r2';
import { OnedriveModule } from '../../common/modules/onedrive/onedrive.module';
import { HttpEmailModule } from '../../common/modules/http-email/http-email.module';
import { LocalCacheModule } from '../../common/modules/local-cache/local-cache.module';
import { RedisPubSubModule } from '../../common/modules/redis-pubsub';
import { IsISO6391Constraint } from '../../decorators/is-iso-6391.decorator';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { GenresModule } from '../genres/genres.module';
import { ProductionsModule } from '../productions/productions.module';
import { CollectionModule } from '../collection/collection.module';
import { TagsModule } from '../tags/tags.module';
import { ChapterTypeModule } from '../chapter-type/chapter-type.module';
import { HistoryModule } from '../history/history.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { RatingsModule } from '../ratings/ratings.module';
import { ExternalStoragesModule } from '../external-storages/external-storages.module';
import { SettingsModule } from '../settings/settings.module';
import { WsAdminModule } from '../ws-admin/ws-admin.module';
import { MongooseConnection, TaskQueue, VideoCodec } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => GenresModule),
    forwardRef(() => ProductionsModule),
    forwardRef(() => CollectionModule),
    forwardRef(() => TagsModule),
    forwardRef(() => ChapterTypeModule),
    forwardRef(() => HistoryModule),
    forwardRef(() => PlaylistsModule),
    forwardRef(() => RatingsModule),
    HistoryModule,
    CloudflareR2Module,
    OnedriveModule,
    HttpEmailModule,
    LocalCacheModule,
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
      name: `${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H264}`,
      defaultJobOptions: {
        removeOnComplete: { age: 600, count: 100 },
        removeOnFail: { age: 600, count: 100 },
        attempts: 3
      }
    }, {
      name: `${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H265}`,
      defaultJobOptions: {
        removeOnComplete: { age: 600, count: 100 },
        removeOnFail: { age: 600, count: 100 },
        attempts: 3
      }
    }, {
      name: `${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.VP9}`,
      defaultJobOptions: {
        removeOnComplete: { age: 600, count: 100 },
        removeOnFail: { age: 600, count: 100 },
        attempts: 3
      }
    }, {
      name: `${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.AV1}`,
      defaultJobOptions: {
        removeOnComplete: { age: 600, count: 100 },
        removeOnFail: { age: 600, count: 100 },
        attempts: 3
      }
    }, {
      name: TaskQueue.VIDEO_TRANSCODE_RESULT,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3
      }
    }),
    RedisPubSubModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redisInstance: new Redis(configService.get<string>('REDIS_QUEUE_URL'))
      })
    })
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaConsumerH264,
    MediaConsumerH265,
    MediaConsumerVP9,
    MediaConsumerAV1,
    MediaResultConsumer,
    IsISO6391Constraint
  ],
  exports: [MediaService]
})
export class MediaModule { }
