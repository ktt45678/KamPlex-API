import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { Playlist, PlaylistSchema } from '../../schemas';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';
import { AzureBlobModule } from '../../common/modules/azure-blob/azure-blob.module';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => MediaModule),
    AzureBlobModule,
    MongooseModule.forFeature([{ name: Playlist.name, schema: PlaylistSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService]
})
export class PlaylistsModule { }
