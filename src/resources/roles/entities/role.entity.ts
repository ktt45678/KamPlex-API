import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class Role {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  position: number;

  @Exclude()
  __v: number;
}
