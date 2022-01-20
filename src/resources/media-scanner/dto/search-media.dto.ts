import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Matches, Max, Min, MinLength } from 'class-validator';

import { StatusCode } from '../../../enums';

export class SearchMediaDto {
  @ApiProperty({
    type: String,
    description: 'Type of media',
    enum: ['movie', 'tv']
  })
  @IsIn(['movie', 'tv'])
  type: string;

  @ApiProperty({
    type: String,
    description: 'Search query',
    required: false,
    minLength: 1
  })
  @IsOptional()
  @MinLength(1, { context: { code: StatusCode.MIN_LENGTH } })
  query: string;

  @ApiProperty({
    type: Number,
    description: 'Page number',
    required: false,
    minimum: 1,
    maximum: 1000,
    default: 1
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Max(1000, { context: { code: StatusCode.MAX_NUMBER } })
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  page: number = 1;

  @ApiProperty({
    type: Number,
    description: 'Media year',
    required: false
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  year: number;

  @ApiProperty({
    type: String,
    description: 'Language in ISO 639-1 (Pattern: ^[a-z]{2}-[A-Z]{2}$)',
    required: false
  })
  @IsOptional()
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, { context: { code: StatusCode.MATCHES_REGEX } })
  language: string;

  @ApiProperty({
    type: Boolean,
    description: 'Inlcude adult (pornography) content in the results',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    return [true, 'true'].indexOf(value) > -1;
  })
  @IsBoolean()
  includeAdult: boolean;
}
