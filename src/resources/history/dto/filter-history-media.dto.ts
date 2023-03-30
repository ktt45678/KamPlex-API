import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsIn, IsInt } from 'class-validator';

import { IsISO6391 } from '../../../decorators/is-iso-6391.decorator';
import { MEDIA_TYPES } from '../../../config';
import { StatusCode } from '../../../enums';

export class FilterHistoryMediaDto {
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
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  @IsOptional()
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
