import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { Media, TVEpisode } from '../../media';
import { User } from '../../users';

export class History {
  @ApiProperty()
  _id: string;

  @Exclude()
  user: User;

  @ApiProperty({
    type: Media
  })
  @Type(() => Media)
  media: Media;

  @ApiProperty({
    type: TVEpisode
  })
  @Type(() => TVEpisode)
  episode: TVEpisode;

  @ApiProperty()
  watchTime: number;

  @ApiProperty()
  date: Date;

  @Exclude()
  __v: number;
}
