import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class RefreshTokenDto {
  @ApiProperty({
    type: String,
    description: 'Refresh token',
    example: 'abcdef'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  refreshToken: string;
}
