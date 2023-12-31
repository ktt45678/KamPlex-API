import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsIn } from 'class-validator';

import { CreateMediaDto } from './create-media.dto';
import { Language, StatusCode } from '../../../enums';
import { I18N_LANGUAGES } from '../../../config';

export class UpdateMediaDto extends PartialType(OmitType(CreateMediaDto, ['type'] as const)) {
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

  @ApiProperty({
    type: Boolean,
    description: 'Update the updatedAt field',
    example: true,
    default: true
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  updateTimestamp: boolean = true;
}
