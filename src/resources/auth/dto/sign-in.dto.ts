import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class SignInDto {
  @ApiProperty({
    type: String,
    description: 'An existing email',
    example: 'johnsake74530@example.com'
  })
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  email: string;

  @ApiProperty({
    type: String,
    description: 'A correct password',
    minLength: 8,
    maxLength: 128,
    example: 'Abcxyz123'
  })
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  password: string;
}
