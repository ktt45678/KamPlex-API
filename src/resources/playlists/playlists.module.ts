import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { Playlist, PlaylistSchema } from '../../schemas/playlist.schema';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    MediaModule,
    MongooseModule.forFeature([{ name: Playlist.name, schema: PlaylistSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [PlaylistsController],
  providers: [PlaylistsService]
})
export class PlaylistsModule { }
