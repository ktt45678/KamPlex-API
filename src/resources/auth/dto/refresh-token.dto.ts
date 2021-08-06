import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class RefreshTokenDto {
  @ApiProperty({
    type: String,
    description: 'Refresh token',
    example: 'abcdef'
  })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  refreshToken: string;
}
