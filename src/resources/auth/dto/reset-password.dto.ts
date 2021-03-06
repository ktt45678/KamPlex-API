import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, Length, Matches } from 'class-validator';

import { StatusCode } from '../../../enums';

export class ResetPasswordDto {
  @ApiProperty({
    type: String,
    description: 'User id',
    example: '348415675948404736'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  id: string;

  @ApiProperty({
    type: String,
    description: 'The code to reset the password',
    example: 'dfzb4C21n2NRhlf9xogL8'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  recoveryCode: string;

  @ApiProperty({
    type: String,
    description: 'A valid password (matches regex ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$)',
    minLength: 8,
    maxLength: 128,
    example: 'Abcxyz123'
  })
  @Type(() => String)
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/, { message: 'password must contain at least one uppercase letter, one lowercase letter and one number', context: { code: StatusCode.MATCHES_REGEX } })
  password: string;
}
