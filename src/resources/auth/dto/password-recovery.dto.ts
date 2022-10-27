import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail } from 'class-validator';

import { ReCaptcha } from '../../../decorators/recaptcha.decorator';
import { StatusCode } from '../../../enums';

export class PasswordRecoveryDto {
  @ApiProperty({
    type: String,
    description: 'Your email address',
    example: 'johnsake74530@example.com'
  })
  @Type(() => String)
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  email: string;

  @ApiProperty({
    type: String,
    description: 'Recaptcha response string'
  })
  @Type(() => String)
  @ReCaptcha({ context: { code: StatusCode.INVALID_CAPTCHA } })
  captcha: string;
}
