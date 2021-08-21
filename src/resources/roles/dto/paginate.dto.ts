import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Length, Matches, Max, Min } from 'class-validator';

import { StatusCode } from 'src/enums/status-code.enum';

export class PaginateDto {
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
  page?: number = 1;

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
  limit?: number = 30;

  @ApiProperty({
    type: String,
    description: 'Search query',
    required: false,
    maxLength: 200,
    minLength: 1
  })
  @IsOptional()
  @Length(1, 200, { context: { code: StatusCode.LENGTH } })
  search?: string;

  @ApiProperty({
    type: String,
    description: 'Sort query',
    required: false,
    maxLength: 200,
    minLength: 1,
    example: 'asc(name),desc(_id)'
  })
  @IsOptional()
  @Length(1, 200, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?:(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))+(?:,(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))*$/, { message: 'sort query must be valid', context: { code: StatusCode.MATCHES_REGEX } })
  sort?: string;

  /*
  @ApiProperty({
    type: String,
    description: 'incl:field1,field2 or excl:field1,field2',
    required: false,
    maxLength: 200,
    minLength: 1,
    example: 'excl:__v'
  })
  @IsOptional()
  @Length(1, 200, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?:incl|excl)\:[\w\.]+(?:,[\w\.]+)*$/, { message: 'fields query must be valid', context: { code: StatusCode.MATCHES_REGEX } })
  fields?: string;
  */
}
