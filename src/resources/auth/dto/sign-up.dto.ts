import { ApiProperty } from '@nestjs/swagger';
import { IsAlphanumeric, IsEmail, Length, MaxLength } from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    type: String,
    description: 'An unique username',
    default: 'john',
    minLength: 3,
    maxLength: 32
  })
  @IsAlphanumeric()
  @Length(3, 32)
  username: string;

  @ApiProperty({
    type: String,
    description: 'A valid email',
    default: 'john@example.com',
    maxLength: 320
  })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({
    type: String,
    description: 'Account password',
    default: '12345678',
    minLength: 8,
    maxLength: 128
  })
  @Length(8, 128)
  password: string;
}
