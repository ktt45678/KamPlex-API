import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseUser {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  banned: boolean;

  @ApiProperty()
  owner?: boolean;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
