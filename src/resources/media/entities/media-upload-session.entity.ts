import { ApiProperty } from '@nestjs/swagger';

export class MediaUploadSession {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  url: string;
}
