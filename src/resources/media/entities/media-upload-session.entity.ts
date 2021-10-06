import { ApiProperty } from '@nestjs/swagger';

export class MediaUploadSession {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  url: string;
}