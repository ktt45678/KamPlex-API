import { ApiProperty } from '@nestjs/swagger';

export class Rating {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  kind: number;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  __v: number;
}
