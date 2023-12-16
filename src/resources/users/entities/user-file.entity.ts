import { ApiProperty } from '@nestjs/swagger';

export class UserFile {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  placeholder: string;

  @ApiProperty()
  mimeType: string;
}
