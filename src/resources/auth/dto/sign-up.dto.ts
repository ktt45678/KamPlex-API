import { ApiProperty } from '@nestjs/swagger';
import { IsAlphanumeric, IsDate, IsEmail, Length, Matches, MaxDate, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { UsernameExist } from '../../../decorators/username-exist.decorator';
import { EmailExist } from '../../../decorators/email-exist.decorator';
import { StatusCode } from '../../../enums/status-code.enum';

export class SignUpDto {
  @ApiProperty({
    type: String,
    description: 'An unique username',
    minLength: 3,
    maxLength: 32,
    example: 'johnsake'
  })
  //@IsAlphanumeric(undefined, { context: { code: StatusCode.IS_ALPHANUMERIC } })
  @Length(3, 32, { context: { code: StatusCode.LENGTH } })
  @UsernameExist({ context: { code: StatusCode.USERNAME_EXIST } })
  username: string;

  @ApiProperty({
    type: String,
    description: 'A valid email',
    example: 'johnsake74530@example.com'
  })
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  @EmailExist({ context: { code: StatusCode.EMAIL_EXIST } })
  email: string;

  @ApiProperty({
    type: String,
    description: 'A valid password (matches regex ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$)',
    minLength: 8,
    maxLength: 128,
    example: 'Abcxyz123'
  })
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/, { message: 'password must contain at least one uppercase letter, one lowercase letter and one number', context: { code: StatusCode.MATCHES_REGEX } })
  password: string;

  @ApiProperty({
    type: String,
    description: 'Account birthdate (yyyy-mm-dd)',
    example: '1998-01-27'
  })
  @Type(() => String)
  @Transform(({ value }) => /^(\d{4})-(\d{2})-(\d{2})$/.test(value) ? new Date(value) : null, { toClassOnly: true })
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  @MaxDate(new Date(), { context: { code: StatusCode.MAX_DATE } })
  birthdate: Date;
}
