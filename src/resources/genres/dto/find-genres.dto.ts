import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, Length, Matches } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';
import { FindGenreDto } from './find-genre.dto';

export class FindGenresDto extends FindGenreDto {
  @ApiProperty({
    type: String,
    description: 'Search query',
    required: false,
    maxLength: 200,
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
    maxLength: 200,
    minLength: 5,
    example: 'asc(name)'
  })
  @Type(() => String)
  @IsOptional()
  @Length(5, 250, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?:(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))+(?:,(?:asc|desc)(?:\([\w\.]+(?:,[\w\.]+)*\)))*$/, { message: 'sort query must be valid', context: { code: StatusCode.MATCHES_REGEX } })
  sort: string;
}