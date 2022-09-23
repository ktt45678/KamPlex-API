import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { Media } from '../../media/entities/media.entity';

export class Playlist {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  @Type(() => Media)
  thumbnailMedia: Media;

  @ApiProperty()
  itemCount: number;

  @ApiProperty()
  visibility: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  __v: number;
}
