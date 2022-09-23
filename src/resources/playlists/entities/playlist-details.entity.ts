import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { User } from '../../users/entities/user.entity';
import { Playlist } from './playlist.entity';

export class PlaylistDetails extends Playlist {
  @ApiProperty({ type: User })
  @Type(() => User)
  author: User;
}