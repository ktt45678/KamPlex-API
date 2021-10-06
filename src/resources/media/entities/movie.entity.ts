import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';

export class Movie {
  @Exclude()
  source: MediaStorage;

  @Exclude()
  streams: MediaStorage[];

  @Exclude()
  subtitles: MediaStorage[];

  @ApiProperty()
  views: number;

  @ApiProperty()
  status: number;
}