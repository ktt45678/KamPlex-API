import { ApiProperty } from '@nestjs/swagger';

export class TranslationData {
  @ApiProperty()
  title: string;

  @ApiProperty()
  overview: string;
}

export class EpisodeTranslationData {
  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;
}
