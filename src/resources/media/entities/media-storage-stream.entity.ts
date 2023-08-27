import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class MediaStorageStream {
  @ApiProperty()
  _id: bigint;

  @Exclude({ toPlainOnly: true })
  type: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  quality: number;

  @ApiProperty()
  channels: number;

  @ApiProperty()
  mimeType: string;
}
