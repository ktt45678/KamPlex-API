import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class Producer {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  country: string;

  @Exclude()
  __v: number;
}
