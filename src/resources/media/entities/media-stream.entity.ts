import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { MediaStreamFile } from './media-stream-file.entity';
import { MediaStreamSubtitle } from './media-stream-subtitle.entity';
import { TVEpisodeDetails } from './tv-episode-details.entity';

@Exclude()
export class MediaStream {
  @ApiProperty({
    type: String
  })
  @Expose()
  @Type(() => String)
  _id: string;

  @ApiProperty({
    type: TVEpisodeDetails
  })
  @Expose()
  @Type(() => TVEpisodeDetails)
  episode: TVEpisodeDetails;

  @ApiProperty({
    type: MediaStreamFile
  })
  @Expose()
  @Type(() => MediaStreamFile)
  streams: MediaStreamFile[];

  @ApiProperty({
    type: MediaStreamSubtitle
  })
  @Expose()
  @Type(() => MediaStreamSubtitle)
  subtitles: MediaStreamSubtitle[];

  @ApiProperty()
  @Expose()
  extStreamList: any;
}