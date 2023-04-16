import { ApiProperty } from '@nestjs/swagger';

export class Owner {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  username: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;
}
