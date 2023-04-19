import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class Tag {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty({
    required: false
  })
  _translated?: boolean;

  @Exclude()
  __v: number;
}
