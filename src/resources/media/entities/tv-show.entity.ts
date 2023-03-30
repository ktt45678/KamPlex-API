import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ShortDate } from '../../../common/entities';
import { TVEpisode } from './tv-episode.entity';

export class TVShow {
  @ApiProperty()
  episodeCount: number;

  @ApiProperty({
    type: TVEpisode
  })
  @Type(() => TVEpisode)
  lastEpisode: TVEpisode;

  @ApiProperty({
    type: TVEpisode
  })
  @Type(() => TVEpisode)
  pLastEpisode: TVEpisode;

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
