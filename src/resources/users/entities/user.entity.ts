import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Role } from '../../roles/entities/role.entity';

export class User {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  @ApiPropertyOptional()
  email: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  @ApiPropertyOptional()
  birthdate: Date;

  @ApiProperty()
  roles: Role[];

  @ApiProperty()
  @ApiPropertyOptional()
  isVerified: boolean;

  @ApiProperty()
  isBanned: boolean;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;
}
