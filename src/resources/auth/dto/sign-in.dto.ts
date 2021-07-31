import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({
    type: String,
    description: 'An existing username',
  })
  username: string;

  @ApiProperty({
    type: String,
    description: 'A valid password',
  })
  password: string;
}
