import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { TranslationData } from './translation-data.entity';

export class MediaTranslation {
  @ApiProperty()
  iso31661: string;

  @ApiProperty()
  iso6391: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  englishName: string;

  @ApiProperty({
    type: TranslationData
  })
  @Type(() => TranslationData)
  data: TranslationData;
}
