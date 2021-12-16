import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';
import { MediaVisibility } from '../../../enums/media-visibility.enum';
import { MEDIA_TYPES, MEDIA_VISIBILITY_TYPES } from '../../../config';

export class CreateMediaDto {
  @ApiProperty({
    type: String,
    description: 'Type of media',
    enum: MEDIA_TYPES
  })
  @Type(() => String)
  @IsIn(MEDIA_TYPES, { context: { code: StatusCode.IS_IN_ARRAY } })
  type: string;

  @ApiProperty({
    type: String,
    description: 'Title',
    minLength: 1,
    maxLength: 500,
    example: 'A new movie'
  })
  @Type(() => String)
  @Length(1, 500, { context: { code: StatusCode.LENGTH } })
  title: string;

  @ApiProperty({
    type: String,
    description: 'Original title',
    minLength: 1,
    maxLength: 500,
    example: 'A movie',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @Length(1, 500, { context: { code: StatusCode.LENGTH } })
  originalTitle: string;

  @ApiProperty({
    type: String,
    description: 'Overview',
    minLength: 10,
    maxLength: 2000,
    example: 'Example overview of the movie'
  })
  @Type(() => String)
  @Length(10, 2000, { context: { code: StatusCode.LENGTH } })
  overview: string;

  @ApiProperty({
    type: [String],
    description: 'Ids of genres',
    example: []
  })
  @Type(() => String)
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  genres: string[];

  @ApiProperty({
    type: String,
    description: 'Original language (Pattern: ^[a-z]{2}$)',
    example: 'en',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @Matches(/^[a-z]{2}$/, { context: { code: StatusCode.MATCHES_REGEX } })
  originalLanguage: string;

  @ApiProperty({
    type: [String],
    description: 'Ids of producers',
    example: []
  })
  @Type(() => String)
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  producers: string[];

  @ApiProperty({
    type: Number,
    description: 'Runtime in minutes',
    minimum: 0,
    maximum: 10000,
    example: 120
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(10000, { context: { code: StatusCode.MAX_NUMBER } })
  runtime: number;

  @ApiProperty({
    type: Boolean,
    description: 'Is an adult movie/TV show?',
    example: false
  })
  @Transform(({ value }) => {
    return [true, 'true'].indexOf(value) > -1;
  })
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  adult: boolean;

  @ApiProperty({
    type: String,
    description: 'Release date',
    example: '2007-10-20'
  })
  @Type(() => String)
  @IsOptional()
  @Transform(({ value }) => /^(\d{4})-(\d{2})-(\d{2})$/.test(value) ? new Date(value) : value, { toClassOnly: true })
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  releaseDate: Date;

  @ApiProperty({
    type: Number,
    description: 'Visibility of the media',
    enum: MEDIA_VISIBILITY_TYPES,
    example: MediaVisibility.PUBLIC
  })
  @Type(() => Number)
  @IsIn(MEDIA_VISIBILITY_TYPES)
  visibility: number;

  @ApiProperty({
    type: String,
    description: 'Media status',
    enum: ['upcoming', 'released', 'airing', 'aired']
  })
  @Type(() => String)
  status: string;
}
