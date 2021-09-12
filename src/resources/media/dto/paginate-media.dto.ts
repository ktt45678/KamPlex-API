import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

import { Language } from '../../../enums/language.enum';
import { StatusCode } from '../../../enums/status-code.enum';
import { I18N_LANGUAGES, MEDIA_TYPES } from '../../../config';

export class PaginateMediaDto {
  @ApiProperty({
    type: Number,
    description: 'Page number',
    required: false,
    minimum: 1,
    maximum: 5000,
    default: 1
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Max(5000, { context: { code: StatusCode.MAX_NUMBER } })
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  page: number = 1;

  @ApiProperty({
    type: Number,
    description: 'Limit items per page',
    required: false,
    minimum: 1,
    maximum: 50,
    default: 30
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Max(50, { context: { code: StatusCode.MAX_NUMBER } })
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  limit: number = 30;

  @ApiProperty({
    type: String,
    description: 'Search query',
    required: false,
    maxLength: 250,
    minLength: 1
  })
  @Type(() => String)
  @IsOptional()
  @Length(1, 250, { context: { code: StatusCode.LENGTH } })
  search: string;

  @ApiProperty({
    type: String,
    description: 'Sort query',
    required: false,
    maxLength: 250,
    minLength: 5,
    example: 'asc(title),desc(_id)'
  })
  @Type(() => String)
  @IsOptional()
  @Length(5, 250, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?:(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))+(?:,(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))*$/, { message: 'sort query must be valid', context: { code: StatusCode.MATCHES_REGEX } })
  sort: string;

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

  @ApiProperty({
    type: String,
    description: 'Type of media',
    enum: MEDIA_TYPES,
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(MEDIA_TYPES, { context: { code: StatusCode.IS_IN_ARRAY } })
  type: string;

  @ApiProperty({
    type: String,
    description: 'Filter by original language (Pattern: ^[a-z]{2}$)',
    example: 'en',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @Matches(/^[a-z]{2}$/, { context: { code: StatusCode.MATCHES_REGEX } })
  originalLanguage: string;

  @ApiProperty({
    type: Number,
    description: 'Filter media by year',
    required: false
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  year: number;

  @ApiProperty({
    type: Boolean,
    description: 'Include adult movie/TV show',
    required: false
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  adult: boolean;

  @ApiProperty({
    type: [String],
    description: 'Filter by genres',
    required: false,
    example: []
  })
  @Type(() => String)
  @IsOptional()
  genres: string | string[];
}
