import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ShortDate } from '../../auth/entities/short-date.entity';
import { User } from './user.entity';

export class UserDetails extends User {
  @ApiProperty()
  email: string;

  @ApiProperty({
    type: ShortDate
  })
  @Type(() => ShortDate)
  birthdate: ShortDate;

  @ApiProperty()
  verified: boolean;
}