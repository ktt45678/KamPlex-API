import { ApiProperty } from '@nestjs/swagger';

export class MediaAltTitle {
  @ApiProperty()
  iso31661: string;

  @ApiProperty()
  iso6391: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;
}
