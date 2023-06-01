import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { EpisodeTranslationData, TranslationData } from './translation-data.entity';

abstract class BaseMediaTranslation {
  @ApiProperty()
  iso31661: string;

  @ApiProperty()
  iso6391: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  englishName: string;
}

export class MediaTranslation extends BaseMediaTranslation {
  @ApiProperty({
    type: TranslationData
  })
  @Type(() => TranslationData)
  data: TranslationData;
}

export class EpisodeTranslation extends BaseMediaTranslation {
  @ApiProperty({
    type: EpisodeTranslationData
  })
  @Type(() => EpisodeTranslationData)
  data: EpisodeTranslationData;
}
