import { ApiProperty } from '@nestjs/swagger';

import { Role } from '../../../schemas';
import { BaseUser } from '../entities';

export class AuthUserDto extends BaseUser {
  @ApiProperty()
  email: string;

  @ApiProperty()
  birthdate: Date;

  @ApiProperty()
  roles: Role[];

  @ApiProperty()
  isAnonymous?: boolean;

  @ApiProperty()
  granted?: number[];

  @ApiProperty()
  hasPermission?: boolean;
}
