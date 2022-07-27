import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class MediaFile {
  _id: string;

  @Exclude({ toPlainOnly: true })
  type: number;

  @Exclude({ toPlainOnly: true })
  name: string;

  @Exclude({ toPlainOnly: true })
  color: number;

  @ApiProperty({ required: false })
  language: string;

  @Exclude({ toPlainOnly: true })
  size: number;

  @Exclude({ toPlainOnly: true })
  mimeType: string;
}