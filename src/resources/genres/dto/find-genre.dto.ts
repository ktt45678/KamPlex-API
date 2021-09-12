import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

import { Language } from '../../../enums/language.enum';
import { StatusCode } from '../../../enums/status-code.enum';
import { I18N_LANGUAGES } from '../../../config';

export class FindGenreDto {
  @ApiProperty({
    type: String,
    description: 'Language to return',
    maxLength: 2,
    default: Language.EN
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(I18N_LANGUAGES, { context: { code: StatusCode.IS_IN_ARRAY } })
  language: string = Language.EN;
}
