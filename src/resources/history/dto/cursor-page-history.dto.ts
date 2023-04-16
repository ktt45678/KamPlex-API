import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional } from 'class-validator';
import { CursorPaginateDto } from '../../../common/dto';

import { IsISO6391 } from '../../../decorators/is-iso-6391.decorator';
import { MEDIA_TYPES } from '../../../config';
import { StatusCode } from '../../../enums';

export class CursorPageHistoryDto extends OmitType(CursorPaginateDto, ['search', 'sort'] as const) {
  @ApiProperty({
    type: Date,
    description: 'Filter by start date',
    required: false
  })
  @Type(() => Date)
  @IsOptional()
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  startDate: Date;

  @ApiProperty({
    type: Date,
    description: 'Filter by end date',
    required: false
  })
  @Type(() => Date)
  @IsOptional()
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  endDate: Date;

  @ApiProperty({
    type: [String],
    description: 'Ids of media',
    required: false
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  mediaIds: bigint | bigint[];

  @ApiProperty({
    type: String,
    description: 'Type of media',
    enum: MEDIA_TYPES,
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(MEDIA_TYPES, { context: { code: StatusCode.IS_IN_ARRAY } })
  mediaType: string;

  @ApiProperty({
    type: String,
    description: 'Filter by original language',
    example: 'en',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsISO6391({ context: { code: StatusCode.IS_ISO6391 } })
  mediaOriginalLanguage: string;

  @ApiProperty({
    type: Number,
    description: 'Filter media by year',
    required: false
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  mediaYear: number;

  @ApiProperty({
    type: Boolean,
    description: 'Include adult movie/TV show',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  @IsOptional()
  mediaAdult: boolean;

  @ApiProperty({
    type: [String],
    description: 'Filter by genres',
    required: false,
    example: []
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  mediaGenres: bigint | bigint[];
}
