import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';

export class Movie {
  @Exclude({ toPlainOnly: true })
  source: MediaStorage;

  @Exclude({ toPlainOnly: true })
  streams: MediaStorage[];

  @Exclude({ toPlainOnly: true })
  subtitles: MediaStorage[];

  @ApiProperty()
  status: number;
}