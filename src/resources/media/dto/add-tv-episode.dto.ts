import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';

import { ShortDate } from '../../auth/entities/short-date.entity';
import { MediaExternalStreams } from '../entities/media-external-streams.entity';
import { IsShortDate } from '../../../decorators/is-short-date.decorator';
import { MediaVisibility, StatusCode } from '../../../enums';
import { MEDIA_VISIBILITY_TYPES } from '../../../config';

export class AddTVEpisodeDto {
  @ApiProperty({
    type: Number,
    description: 'Episode number',
    minimum: 0,
    maximum: 10000,
    example: 1
  })
  @Type(() => Number)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.LENGTH } })
  @Max(10000, { context: { code: StatusCode.LENGTH } })
  episodeNumber: number;

  @ApiProperty({
    type: String,
    description: 'Name of the episode',
    maxLength: 500,
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @MaxLength(500, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Overview of the episode',
    maxLength: 2000,
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @ValidateIf(o => o.overview !== '')
  @MinLength(10, { context: { code: StatusCode.MIN_LENGTH } })
  @MaxLength(2000, { context: { code: StatusCode.MAX_LENGTH } })
  overview: string;

  @ApiProperty({
    type: Number,
    description: 'Runtime in seconds',
    minimum: 0,
    maximum: 600000,
    example: 120
  })
  @Type(() => Number)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(600000, { context: { code: StatusCode.MAX_NUMBER } })
  runtime: number;

  @ApiProperty({
    type: ShortDate,
    description: 'Air date'
  })
  @Type(() => ShortDate)
  @ValidateNested()
  @IsShortDate({ context: { code: StatusCode.IS_SHORT_DATE } })
  airDate: ShortDate;

  @ApiProperty({
    type: Number,
    description: 'Visibility of the episode',
    enum: MEDIA_VISIBILITY_TYPES,
    example: MediaVisibility.PUBLIC
  })
  @Type(() => Number)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @IsIn(MEDIA_VISIBILITY_TYPES, { context: { code: StatusCode.IS_IN_ARRAY } })
  visibility: number;

  @ApiProperty({
    type: MediaExternalStreams,
    description: 'Stream ids from external sites',
    required: false
  })
  @Type(() => MediaExternalStreams)
  @IsOptional()
  @ValidateNested()
  extStreams: MediaExternalStreams;
}
