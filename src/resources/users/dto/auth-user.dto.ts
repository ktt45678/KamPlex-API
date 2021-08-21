import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../roles/entities/role.entity';

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
  isVerified: boolean;

  @ApiProperty()
  isBanned: boolean;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  isAnonymous: boolean;

  @ApiProperty()
  isOwner: boolean;

  @ApiProperty()
  hasPermission: boolean;
}