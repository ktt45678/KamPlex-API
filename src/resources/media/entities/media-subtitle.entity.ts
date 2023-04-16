import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class MediaSubtitle {
  @ApiProperty()
  _id: bigint;

  @Exclude({ toPlainOnly: true })
  type: number;

  @Exclude({ toPlainOnly: true })
  name: string;

  @ApiProperty()
  lang: string;

  @Exclude({ toPlainOnly: true })
  size: number;

  @Exclude({ toPlainOnly: true })
  mimeType: string;
}
