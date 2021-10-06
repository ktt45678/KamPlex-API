import { ApiProperty } from '@nestjs/swagger';

export class MediaVideo {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  site: string;
}