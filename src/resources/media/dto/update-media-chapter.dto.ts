import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsIn } from 'class-validator';

import { AddMediaChapterDto } from './add-media-chapter.dto';
import { Language, StatusCode } from '../../../enums';
import { I18N_LANGUAGES } from '../../../config';

export class UpdateMediaChapterDto extends PartialType(AddMediaChapterDto) {
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
