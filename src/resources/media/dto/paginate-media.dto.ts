import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

import { IsISO6391 } from '../../../decorators/is-iso-6391.decorator';
import { StatusCode } from '../../../enums';
import { MEDIA_TYPES } from '../../../config';
import { transformBigInt } from '../../../utils';

export class PaginateMediaDto {
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
    description: 'Filter by original language',
    example: 'en',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsISO6391({ context: { code: StatusCode.IS_ISO6391 } })
  originalLang: string;

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
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  adult: boolean;

  @ApiProperty({
    type: [String],
    description: 'Filter by genres',
    required: false,
    example: []
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  genres: bigint | bigint[];

  @ApiProperty({
    type: [String],
    description: 'Filter by tags',
    required: false,
    example: []
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  tags: bigint | bigint[];

  @ApiProperty({
    type: String,
    description: 'Match all or any provided genre(s)',
    example: 'all',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(['all', 'any'])
  genreMatch: 'all' | 'any' = 'all';

  @ApiProperty({
    type: String,
    description: 'Match all or any provided tag(s)',
    example: 'all',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(['all', 'any'])
  tagMatch: 'all' | 'any' = 'all';

  @ApiProperty({
    type: [String],
    description: 'Exclude media ids',
    required: false,
    example: []
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  excludeIds: bigint | bigint[];

  @ApiProperty({
    type: Boolean,
    description: 'Include hidden shows (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeHidden: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed shows, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeUnprocessed: boolean;
}
