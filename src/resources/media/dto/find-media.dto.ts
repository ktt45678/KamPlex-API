import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, MaxLength } from 'class-validator';

import { StatusCode } from '../../../enums';

export class FindMediaDto {
  @ApiProperty({
    type: Boolean,
    description: 'Include hidden episodes (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeHiddenEps: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed episodes, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeUnprocessedEps: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include hidden media when including the inCollections field (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeHiddenMedia: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed media when including the inCollections field, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeUnprocessedMedia: boolean;

  @ApiProperty({
    type: String,
    description: 'Append other fields to the response',
    maxLength: 500,
    required: false,
    example: 'inCollections'
  })
  @Type(() => String)
  @IsOptional()
  @MaxLength(500, { context: { code: StatusCode.MAX_LENGTH } })
  appendToResponse: string;
}
