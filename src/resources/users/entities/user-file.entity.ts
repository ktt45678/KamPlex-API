import { ApiProperty } from '@nestjs/swagger';

export class UserFile {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  mimeType: string;
}
