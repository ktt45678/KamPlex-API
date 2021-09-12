import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class PasswordRecoveryDto {
  @ApiProperty({
    type: String,
    description: 'Your email address',
    example: 'johnsake74530@example.com'
  })
  @Type(() => String)
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  email: string;
}
