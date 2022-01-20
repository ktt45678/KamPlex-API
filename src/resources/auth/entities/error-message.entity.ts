import { ApiProperty } from '@nestjs/swagger';

import { StatusCode } from '../../../enums';

export class ErrorMessage {
  @ApiProperty({
    type: Number,
    description: 'Error code',
    required: false
  })
  code?: StatusCode;

  @ApiProperty({
    type: String,
    description: 'Message content'
  })
  message: string;
}
