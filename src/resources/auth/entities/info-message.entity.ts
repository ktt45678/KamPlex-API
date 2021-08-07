import { ApiProperty } from '@nestjs/swagger';

export class InfoMessage {
  @ApiProperty({
    type: String,
    description: 'Message content'
  })
  message: string;
}
