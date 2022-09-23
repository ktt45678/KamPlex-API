import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ShortDate } from '../../auth/entities/short-date.entity';
import { TVEpisode } from './tv-episode.entity';

export class TVShow {
  @ApiProperty()
  episodeCount: number;

  @ApiProperty()
  publicEpisodeCount: number;

  @ApiProperty({
    type: ShortDate
  })
  @Type(() => ShortDate)
  lastAirDate: ShortDate;

  @ApiProperty({
    type: TVEpisode
  })
  @Type(() => TVEpisode)
  episodes: TVEpisode[];
}