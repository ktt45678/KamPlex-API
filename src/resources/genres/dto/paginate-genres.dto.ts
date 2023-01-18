import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Length, Matches, Max, Min } from 'class-validator';

import { RegexPattern, StatusCode } from '../../../enums';

export class PaginateGenresDto {
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
    example: 'asc(name),desc(_id)'
  })
  @Type(() => String)
  @IsOptional()
  @Length(5, 250, { context: { code: StatusCode.LENGTH } })
  @Matches(RegexPattern.PAGINATE_SORT_QUERY, { message: 'sort query must be valid', context: { code: StatusCode.MATCHES_REGEX } })
  sort: string;
}
