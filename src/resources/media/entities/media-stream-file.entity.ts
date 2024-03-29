import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class MediaStreamFile {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  type: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  quality: number;

  @ApiProperty()
  codec: number;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @Exclude({ toPlainOnly: true })
  __v: number;
}
