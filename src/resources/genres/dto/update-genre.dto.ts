import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNotEmpty, MaxLength, IsIn } from 'class-validator';

import { Language } from '../../../enums/language.enum';
import { StatusCode } from '../../../enums/status-code.enum';
import { GenreExist } from '../../../decorators/genre-exist.decorator';
import { I18N_LANGUAGES } from '../../../config';

export class UpdateGenreDto {
  @ApiProperty({
    type: String,
    description: 'Genre name',
    maxLength: 32,
    example: 'Comedy'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(32, { context: { code: StatusCode.MAX_LENGTH } })
  @GenreExist({ context: { code: StatusCode.GENRE_EXIST } })
  name: string;

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
