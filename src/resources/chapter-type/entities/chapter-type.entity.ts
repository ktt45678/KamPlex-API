import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class ChapterType {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty({
    required: false
  })
  _translated?: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Exclude({ toPlainOnly: true })
  __v: number;
}
