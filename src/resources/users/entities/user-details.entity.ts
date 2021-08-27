import { ApiProperty } from '@nestjs/swagger';

import { User } from './user.entity';

export class UserDetails extends User {
  @ApiProperty()
  email: string;

  @ApiProperty()
  birthdate: Date;

  @ApiProperty()
  verified: boolean;
}