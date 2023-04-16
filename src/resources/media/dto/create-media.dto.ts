import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

import { ShortDate } from '../../../common/entities';
import { MediaExternalIds } from '../entities/media-external-ids.entity';
import { MediaScannerData } from '../entities/media-scanner-data.entiry';
import { IsShortDate } from '../../../decorators/is-short-date.decorator';
import { MaxShortDate } from '../../../decorators/max-short-date.decorator';
import { IsISO6391 } from '../../../decorators/is-iso-6391.decorator';
import { StatusCode, MediaVisibility } from '../../../enums';
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
  @IsOptional()
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  genres: string[];

  @ApiProperty({
    type: [String],
    description: 'Ids of studios',
    example: []
  })
  @Type(() => String)
  @IsOptional()
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  studios: string[];

  @ApiProperty({
    type: [String],
    description: 'Ids of producers',
    example: []
  })
  @Type(() => String)
  @IsOptional()
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  producers: string[];

  @ApiProperty({
    type: [String],
    description: 'Ids of tags',
    example: []
  })
  @Type(() => String)
  @IsOptional()
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  tags: string[];

  @ApiProperty({
    type: String,
    description: 'Original language',
    example: 'en',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsISO6391({ context: { code: StatusCode.IS_ISO6391 } })
  originalLang: string;

  @ApiProperty({
    type: Number,
    description: 'Runtime in seconds',
    minimum: 0,
    maximum: 600_000,
    example: 120
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(600_000, { context: { code: StatusCode.MAX_NUMBER } })
  runtime: number;

  @ApiProperty({
    type: Boolean,
    description: 'Is an adult movie/TV show?',
    example: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  adult: boolean;

  @ApiProperty({
    type: ShortDate,
    description: 'Release date',
  })
  @Type(() => ShortDate)
  @ValidateNested()
  @IsShortDate({ context: { code: StatusCode.IS_SHORT_DATE } })
  @MaxShortDate(new Date(), { context: { code: StatusCode.MAX_SHORT_DATE } })
  releaseDate: ShortDate;

  @ApiProperty({
    type: ShortDate,
    description: 'Last air date (TV Show)',
    required: false
  })
  @Type(() => ShortDate)
  @IsOptional()
  @ValidateNested()
  @IsShortDate({ context: { code: StatusCode.IS_SHORT_DATE } })
  @MaxShortDate(new Date(), { context: { code: StatusCode.MAX_SHORT_DATE } })
  lastAirDate: ShortDate;

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
  @IsIn(['upcoming', 'released', 'airing', 'aired'], { context: { code: StatusCode.IS_IN_ARRAY } })
  status: string;

  @ApiProperty({
    type: MediaExternalIds,
    description: 'Show\'s ids from external sites',
    required: false
  })
  @Type(() => MediaExternalIds)
  @IsOptional()
  @ValidateNested()
  externalIds: MediaExternalIds;

  @ApiProperty({
    type: MediaScannerData,
    description: 'Data for media scanner',
    required: false
  })
  @Type(() => MediaScannerData)
  @IsOptional()
  @ValidateNested()
  scanner: MediaScannerData;
}
