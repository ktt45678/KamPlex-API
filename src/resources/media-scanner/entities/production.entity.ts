import { ApiProperty } from '@nestjs/swagger';

export class Production {
  @ApiProperty()
  name: string;

  @ApiProperty()
  country: string;
}
