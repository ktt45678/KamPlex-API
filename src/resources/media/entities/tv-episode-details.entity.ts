import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { MediaFile } from './media-file.entity';
import { TVEpisode } from './tv-episode.entity';

export class TVEpisodeDetails extends TVEpisode {
  @ApiProperty()
  @Type(() => MediaFile)
  subtitles: MediaFile[];
}