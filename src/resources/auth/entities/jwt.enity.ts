import { ApiProperty } from "@nestjs/swagger";

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

  constructor(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}