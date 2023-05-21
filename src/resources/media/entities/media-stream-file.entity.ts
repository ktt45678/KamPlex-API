import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { Media } from './media.entity';

export class MediaStreamFile {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  type: number;

  @ApiProperty()
  name: string;

  @Exclude({ toPlainOnly: true })
  path: string;

  @ApiProperty()
  quality: number;

  @ApiProperty()
  codec: number;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @Exclude({ toPlainOnly: true })
  media: Media;

  @Exclude({ toPlainOnly: true })
  __v: number;
}
