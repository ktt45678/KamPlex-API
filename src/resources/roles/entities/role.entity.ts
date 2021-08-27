import { ApiProperty } from '@nestjs/swagger';

export class Role {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  position: number;
}
