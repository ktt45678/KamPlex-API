import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, Length } from 'class-validator';

import { StatusCode } from '../../../enums';

export class SignInDto {
  @ApiProperty({
    type: String,
    description: 'An existing email',
    example: 'johnsake74530@example.com'
  })
  @Type(() => String)
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  email: string;

  @ApiProperty({
    type: String,
    description: 'A correct password',
    minLength: 8,
    maxLength: 128,
    example: 'Abcxyz123'
  })
  @Type(() => String)
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  password: string;
}
