import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { Media } from '../../media/entities/media.entity';
import { User } from '../../users/entities/user.entity';

export class Playlist {
  @ApiProperty()
  _id: string;

  @ApiProperty({ type: User })
  @Type(() => User)
  author: User;

  @ApiProperty({ type: Media })
  @Type(() => Media)
  media: Media;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  __v: number;
}
