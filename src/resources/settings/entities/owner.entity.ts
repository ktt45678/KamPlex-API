import { ApiProperty } from '@nestjs/swagger';

export class Owner {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;
}
