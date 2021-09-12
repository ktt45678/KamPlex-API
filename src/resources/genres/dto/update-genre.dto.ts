import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsIn, IsNotEmpty, MaxLength } from 'class-validator';

import { Language } from '../../../enums/language.enum';
import { StatusCode } from '../../../enums/status-code.enum';
import { I18N_LANGUAGES } from '../../../config';
import { GenreExist } from '../../../decorators/genre-exist.decorator';

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
    description: 'Language to set',
    maxLength: 2,
    default: Language.EN
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(I18N_LANGUAGES, { context: { code: StatusCode.IS_IN_ARRAY } })
  language: string = Language.EN;
}
