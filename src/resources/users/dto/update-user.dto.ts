import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEmail, IsOptional, Length, Matches, MaxDate, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { UsernameExist } from '../../../decorators/username-exist.decorator';
import { EmailExist } from '../../../decorators/email-exist.decorator';
import { StatusCode } from '../../../enums/status-code.enum';

export class UpdateUserDto {
  @ApiProperty({
    type: String,
    description: 'An unique username',
    minLength: 3,
    maxLength: 32,
    required: false
  })
  @IsOptional()
  @Length(3, 32, { context: { code: StatusCode.LENGTH } })
  @UsernameExist({ context: { code: StatusCode.USERNAME_EXIST } })
  username: string;

  @ApiProperty({
    type: String,
    description: 'A display name',
    minLength: 3,
    maxLength: 32,
    required: false
  })
  @IsOptional()
  @MaxLength(32, { context: { code: StatusCode.MAX_LENGTH } })
  displayName: string;

  @ApiProperty({
    type: String,
    description: 'A valid email',
    required: false
  })
  @IsOptional()
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  @EmailExist({ context: { code: StatusCode.EMAIL_EXIST } })
  email: string;

  @ApiProperty({
    type: String,
    description: 'A valid password (matches regex ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$)',
    minLength: 8,
    maxLength: 128,
    required: false
  })
  @IsOptional()
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/, { message: 'password must contain at least one uppercase letter, one lowercase letter and one number', context: { code: StatusCode.MATCHES_REGEX } })
  password: string;

  @ApiProperty({
    type: String,
    description: 'Account birthdate (yyyy-mm-dd)',
    required: false
  })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => /^(\d{4})-(\d{2})-(\d{2})$/.test(value) ? new Date(value) : value, { toClassOnly: true })
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  @MaxDate(new Date(), { context: { code: StatusCode.MAX_DATE } })
  birthdate: Date;

  @ApiProperty({
    type: Boolean,
    description: 'Generate a random password and send a reset password link to user\'s email (restore user account)',
    required: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  restoreAccount: boolean;
}
