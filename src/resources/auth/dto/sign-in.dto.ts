import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

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
    maxLength: 128,
    example: 'Abcxyz123'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(128, { context: { code: StatusCode.MAX_LENGTH } })
  password: string;
}
