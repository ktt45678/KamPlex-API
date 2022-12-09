import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class Rating {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  date: Date;

  @Exclude()
  __v: number;
}
