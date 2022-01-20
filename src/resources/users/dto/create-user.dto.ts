import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, Length, Matches, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { UsernameExist } from '../../../decorators/username-exist.decorator';
import { EmailExist } from '../../../decorators/email-exist.decorator';
import { PropertyMatches } from '../../../decorators/property-matches.decorator';
import { IsShortDate } from '../../../decorators/is-short-date.decorator';
import { MaxShortDate } from '../../../decorators/max-short-date.decorator';
import { ShortDate } from '../../auth/entities/short-date.entity';
import { StatusCode } from '../../../enums';

export class CreateUserDto {
  @ApiProperty({
    type: String,
    description: 'An unique username',
    minLength: 3,
    maxLength: 32,
    required: false
  })
  @Type(() => String)
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
  @Type(() => String)
  @IsOptional()
  @Length(3, 32, { context: { code: StatusCode.LENGTH } })
  @UsernameExist({ context: { code: StatusCode.USERNAME_EXIST } })
  displayName: string;

  @ApiProperty({
    type: String,
    description: 'A valid email',
    required: false
  })
  @Type(() => String)
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
  @Type(() => String)
  @IsOptional()
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/, { message: 'password must contain at least one uppercase letter, one lowercase letter and one number', context: { code: StatusCode.MATCHES_REGEX } })
  password: string;

  @ApiProperty({
    type: String,
    description: 'Enter your password again',
    minLength: 8,
    maxLength: 128,
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @ValidateIf(o => !!o.password)
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  @PropertyMatches('password', { context: { code: StatusCode.PASSWORDS_NOT_MATCH } })
  confirmPassword: string;

  @ApiProperty({
    type: ShortDate,
    description: 'Account birthdate'
  })
  @Type(() => ShortDate)
  @ValidateNested()
  @IsShortDate({ context: { code: StatusCode.IS_SHORT_DATE } })
  @MaxShortDate(new Date(), { context: { code: StatusCode.MAX_SHORT_DATE } })
  birthdate: ShortDate;
}
