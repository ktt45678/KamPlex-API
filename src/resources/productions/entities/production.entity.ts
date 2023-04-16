import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class Production {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty()
  country: string;

  @Exclude()
  __v: number;
}
