import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class Role {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  permissions: number;

  @ApiProperty()
  position: number;

  @Exclude()
  __v: number;
}
