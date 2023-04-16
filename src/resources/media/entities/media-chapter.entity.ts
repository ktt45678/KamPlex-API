import { ApiProperty } from '@nestjs/swagger';

export class MediaChapter {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty()
  start: number;

  @ApiProperty()
  end: number;
}
