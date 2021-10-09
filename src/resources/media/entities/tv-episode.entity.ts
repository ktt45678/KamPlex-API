import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';
import { MediaSubtitle } from './media-subtitle.entity';

export class TVEpisode {
  @ApiProperty()
  airDate: string;

  @ApiProperty()
  episodeNumber: number;

  @ApiProperty()
  runtime: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;

  @Exclude({ toPlainOnly: true })
  still: MediaStorage;

  @ApiProperty()
  visibility: number;

  @Exclude({ toPlainOnly: true })
  subtitles: MediaSubtitle[];

  @ApiProperty({
    type: MediaStorage
  })
  @Type(() => MediaStorage)
  sources: MediaStorage[]

  @Expose({ toPlainOnly: true })
  get stillUrl(): string {
    return `${this.still.storage.publicUrl}/${this.still.path}`;
  }
}