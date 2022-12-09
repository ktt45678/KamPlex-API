import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

import { CreateCollectionDto } from './create-collection.dto';
import { Language, StatusCode } from '../../../enums';
import { I18N_LANGUAGES } from '../../../config';

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {
  @ApiProperty({
    type: String,
    description: 'Language to translate',
    enum: I18N_LANGUAGES,
    default: Language.EN
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(I18N_LANGUAGES, { context: { code: StatusCode.IS_IN_ARRAY } })
  translate: string = Language.EN;
}
