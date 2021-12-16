import { ApiProperty } from '@nestjs/swagger';

export class Rating {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  date: Date;

  __v: number;
}
