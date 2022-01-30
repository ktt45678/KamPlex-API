import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class MediaFile {
  _id: string;

  @Exclude({ toPlainOnly: true })
  type: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  color: number;

  @ApiProperty({ required: false })
  language: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  mimeType: string;
}