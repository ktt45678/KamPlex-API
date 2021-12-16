import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEmail, IsOptional, Length, Matches, MaxDate, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { StatusCode } from '../../../enums/status-code.enum';

export class UpdateUserDto {
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
  @MaxLength(32, { context: { code: StatusCode.MAX_LENGTH } })
  displayName: string;

  @ApiProperty({
    type: String,
    description: 'A valid email',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  email: string;

  @ApiProperty({
    type: String,
    description: 'Current password',
    minLength: 8,
    maxLength: 128,
    example: 'Abcxyz123'
  })
  @Type(() => String)
  @IsOptional()
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  currentPassword: string;

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
    description: 'Account birthdate (yyyy-mm-dd)',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @Transform(({ value }) => {
    if (value == undefined) return value;
    const d = new Date(value);
    if (d instanceof Date && !isNaN(d.getTime()))
      return d;
    return undefined;
  }, { toClassOnly: true })
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  @MaxDate(new Date(), { context: { code: StatusCode.MAX_DATE } })
  birthdate: Date;

  @ApiProperty({
    type: Boolean,
    description: 'Generate a random password and send a reset password link to user\'s email (restore user account)',
    required: false
  })
  @Transform(({ value }) => {
    return [true, 'true'].indexOf(value) > -1;
  })
  @IsOptional()
  @IsBoolean()
  restoreAccount: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Account ban status, for users with granted permissions',
    required: false
  })
  @Transform(({ value }) => {
    return [true, 'true'].indexOf(value) > -1;
  })
  @IsOptional()
  @IsBoolean()
  banned: boolean;
}
