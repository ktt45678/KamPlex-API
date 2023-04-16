import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { Media } from '../../media/entities/media.entity';

export class PlaylistItem {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  @Type(() => Media)
  media: Media;

  @ApiProperty()
  addedAt: Date;

  @Exclude()
  __v: number;
}
