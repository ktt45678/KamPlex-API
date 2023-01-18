import { ApiProperty } from '@nestjs/swagger';

import { TVSeason } from './tv-season.entity';
import { TVEpisode } from './tv-episode.entity';

export class TVSeasonDetails extends TVSeason {
  @ApiProperty()
  episodes: TVEpisode[];
}
