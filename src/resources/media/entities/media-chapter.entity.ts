import { ApiProperty } from '@nestjs/swagger';

export class MediaChapter {
  @ApiProperty()
  name: string;

  @ApiProperty()
  start: number;

  @ApiProperty()
  end: number;
}