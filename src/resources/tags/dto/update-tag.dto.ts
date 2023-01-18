import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsIn } from 'class-validator';

import { CreateTagDto } from './create-tag.dto';
import { I18N_LANGUAGES } from '../../../config';
import { Language, StatusCode } from '../../../enums';

export class UpdateTagDto extends PartialType(CreateTagDto) {
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
