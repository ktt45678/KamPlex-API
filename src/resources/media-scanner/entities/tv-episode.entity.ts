import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { EpisodeTranslation } from './media-translation.entity';

export class TVEpisode {
  @ApiProperty()
  airDate: string;

  @ApiProperty()
  episodeNumber: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;

  @ApiProperty()
  runtime: number;

  @ApiProperty()
  @Exclude({ toPlainOnly: true })
  stillPath: string;

  @ApiProperty({
    type: [EpisodeTranslation]
  })
  translations: EpisodeTranslation[];

  @Expose()
  get stillUrl(): string {
    return `https://image.tmdb.org/t/p/original${this.stillPath}`;
  }
}
