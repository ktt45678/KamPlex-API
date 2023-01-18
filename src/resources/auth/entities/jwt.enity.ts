import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { UserDetails } from '../../users/entities/user-details.entity';

export class Jwt {
  @ApiProperty({
    type: String,
    description: 'Access token'
  })
  accessToken: string;

  //@ApiProperty({
  //  type: String,
  //  description: 'Refresh token'
  //})
  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  @Exclude({ toPlainOnly: true })
  refreshTokenExpiry: number;

  @ApiProperty({
    type: UserDetails,
    description: 'User payload'
  })
  @Type(() => UserDetails)
  payload: UserDetails;

  @Exclude({ toPlainOnly: true })
  __v: number;

  constructor(accessToken: string, refreshToken: string, refreshTokenExpiry: number, payload: UserDetails) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.refreshTokenExpiry = refreshTokenExpiry;
    this.payload = payload;
  }
}
