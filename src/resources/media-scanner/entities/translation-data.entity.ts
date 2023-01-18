import { ApiProperty } from '@nestjs/swagger';

export class TranslationData {
  @ApiProperty()
  title: string;

  @ApiProperty()
  overview: string;
}
