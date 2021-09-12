import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsIn } from 'class-validator';

import { CreateMediaDto } from './create-media.dto';
import { Language } from '../../../enums/language.enum';
import { StatusCode } from '../../../enums/status-code.enum';
import { I18N_LANGUAGES } from '../../../config';

export class UpdateMediaDto extends PartialType(OmitType(CreateMediaDto, ['type'] as const)) {
  @ApiProperty({
    type: String,
    description: 'Language to set',
    maxLength: 2,
    default: Language.EN
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(I18N_LANGUAGES, { context: { code: StatusCode.IS_IN_ARRAY } })
  language: string = Language.EN;
}
