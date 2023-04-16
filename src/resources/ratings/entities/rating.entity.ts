import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { Media } from '../../media';

export class Rating {
  @ApiProperty()
  _id: bigint;

  @ApiProperty({ type: Media })
  @Type(() => Media)
  media: Media;

  @ApiProperty()
  score: number;

  @ApiProperty()
  date: Date;

  @Exclude()
  __v: number;
}
