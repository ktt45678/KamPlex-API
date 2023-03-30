import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { UsernameExist } from '../../../decorators/username-exist.decorator';
import { MaxShortDate } from '../../../decorators/max-short-date.decorator';
import { IsShortDate } from '../../../decorators/is-short-date.decorator';
import { EmailExist } from '../../../decorators/email-exist.decorator';
import { ShortDate } from '../../../common/entities';
import { RegexPattern, StatusCode } from '../../../enums';

export class SignUpDto {
  @ApiProperty({
    type: String,
    description: 'An unique username',
    minLength: 3,
    maxLength: 32,
    example: 'johnsake'
  })
  @Type(() => String)
  @Length(3, 32, { context: { code: StatusCode.LENGTH } })
  @UsernameExist({ context: { code: StatusCode.USERNAME_EXIST } })
  username: string;

  @ApiProperty({
    type: String,
    description: 'A valid email',
    example: 'johnsake74530@example.com'
  })
  @Type(() => String)
  @IsEmail(undefined, { context: { code: StatusCode.IS_EMAIL } })
  @EmailExist({ context: { code: StatusCode.EMAIL_EXIST } })
  email: string;

  @ApiProperty({
    type: String,
    description: 'A valid password',
    minLength: 8,
    maxLength: 128,
    example: 'Abcxyz123'
  })
  @Type(() => String)
  @Length(8, 128, { context: { code: StatusCode.LENGTH } })
  @Matches(RegexPattern.ACCOUNT_PASSWORD, { message: 'password must contain at least one uppercase character, one lowercase character and one number', context: { code: StatusCode.MATCHES_REGEX } })
  password: string;

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
