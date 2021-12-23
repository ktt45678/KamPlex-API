import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { TVEpisode } from './tv-episode.entity';

export class TVShow {
  @ApiProperty()
  episodeCount: number;

  @ApiProperty()
  lastAirDate: string;

  @ApiProperty({
    type: TVEpisode
  })
  @Type(() => TVEpisode)
  episodes: TVEpisode[];
}