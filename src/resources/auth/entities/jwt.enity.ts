import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { UserDetails } from '../../users/entities/user-details.entity';

export class Jwt {
  @ApiProperty({
    type: String,
    description: 'Access token'
  })
  accessToken: string;

  @ApiProperty({
    type: String,
    description: 'Refresh token'
  })
  refreshToken: string;

  @ApiProperty({
    type: UserDetails,
    description: 'User payload'
  })
  @Type(() => UserDetails)
  payload: UserDetails;

  constructor(accessToken: string, refreshToken: string, payload: UserDetails) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.payload = payload;
  }
}