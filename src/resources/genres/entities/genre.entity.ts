import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class Genre {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  _translated: boolean;

  @Exclude()
  __v: number;
}
