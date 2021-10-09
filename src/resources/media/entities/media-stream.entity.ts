import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { MediaStreamFile } from './media-stream-file.entity';
import { MediaStreamSubtitle } from './media-stream-subtitle.entity';

@Exclude()
export class MediaStream {
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
}