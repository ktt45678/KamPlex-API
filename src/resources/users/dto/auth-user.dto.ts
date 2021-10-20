import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../schemas/role.schema';

export class AuthUserDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  birthdate: Date;

  @ApiProperty()
  roles: Role[];

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

  @ApiProperty()
  isAnonymous?: boolean;

  @ApiProperty()
  granted?: number[];

  @ApiProperty()
  hasPermission?: boolean;
}