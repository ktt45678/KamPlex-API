import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class PasswordRecoveryDto {
  @ApiProperty({
    type: String,
    description: 'Your email address',
    example: 'johnsake74530@example.com'
  })
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  email: string;
}
