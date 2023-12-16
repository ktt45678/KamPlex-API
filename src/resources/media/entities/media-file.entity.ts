import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class MediaFile {
  _id: bigint;

  @Exclude({ toPlainOnly: true })
  type: number;

  @Exclude({ toPlainOnly: true })
  name: string;

  @Exclude({ toPlainOnly: true })
  color: number;

  @Exclude({ toPlainOnly: true })
  placeholder: string;

  @ApiProperty({ required: false })
  lang: string;

  @Exclude({ toPlainOnly: true })
  size: number;

  @Exclude({ toPlainOnly: true })
  mimeType: string;
}
