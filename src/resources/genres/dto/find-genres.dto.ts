import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsOptional, Length, Matches } from 'class-validator';

import { RegexPattern, StatusCode } from '../../../enums';
import { FindGenreDto } from './find-genre.dto';

export class FindGenresDto extends FindGenreDto {
  @ApiProperty({
    type: [String],
    description: 'Find by genre ids',
    required: true,
    example: ['268016436369163264']
  })
  @Type(() => String)
  @Transform(({ value }) => !Array.isArray(value) ? [value] : value)
  @IsOptional({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  ids: string[];

  /*
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
  */

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
  @Matches(RegexPattern.PAGINATE_SORT_QUERY, { message: 'sort query must be valid', context: { code: StatusCode.MATCHES_REGEX } })
  sort: string;
}
