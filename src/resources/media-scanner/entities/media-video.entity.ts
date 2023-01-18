import { ApiProperty } from '@nestjs/swagger';

export class MediaVideo {
  @ApiProperty()
  name: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  official: boolean;
}
