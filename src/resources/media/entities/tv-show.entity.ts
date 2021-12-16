import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { TVEpisode } from './tv-episode.entity';

export class TVShow {

  @ApiProperty()
  episodeRuntime: number[];

  @ApiProperty()
  firstAirDate: string;

  @ApiProperty()
  lastAirDate: string;

  @ApiProperty({
    type: TVEpisode
  })
  @Type(() => TVEpisode)
  episodes: TVEpisode[];
}