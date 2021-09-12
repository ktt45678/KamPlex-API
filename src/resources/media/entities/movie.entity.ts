import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';
import { MediaSubtitle } from './media-subtitle.entity';

export class Movie {
  @ApiProperty()
  @Type(() => MediaStorage)
  sources: MediaStorage[];

  @Exclude({ toPlainOnly: true })
  subtitles: MediaSubtitle[];

  @ApiProperty()
  views: number;
}