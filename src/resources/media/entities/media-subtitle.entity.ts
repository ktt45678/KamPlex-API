import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class MediaSubtitle {
  @ApiProperty()
  _id: string;

  @Exclude({ toPlainOnly: true })
  type: number;

  @Exclude({ toPlainOnly: true })
  name: string;

  @ApiProperty()
  language: string;

  @Exclude({ toPlainOnly: true })
  size: number;

  @Exclude({ toPlainOnly: true })
  mimeType: string;
}