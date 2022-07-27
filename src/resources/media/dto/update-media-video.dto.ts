import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsIn } from 'class-validator';

import { AddMediaVideoDto } from './add-media-video.dto';
import { Language, StatusCode } from '../../../enums';
import { I18N_LANGUAGES } from '../../../config';

export class UpdateMediaVideoDto extends PartialType(AddMediaVideoDto) {
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
