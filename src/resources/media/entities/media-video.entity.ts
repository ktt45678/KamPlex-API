import { ApiProperty } from '@nestjs/swagger';

export class MediaVideo {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  site: string;

  @ApiProperty()
  official: boolean;
}
