import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Length } from 'class-validator';

import { StatusCode } from '../../../enums';

export class CreateCollectionDto {
  @ApiProperty({
    type: String,
    description: 'Collection name',
    minLength: 1,
    maxLength: 500,
    example: 'A new movie collection'
  })
  @Type(() => String)
  @Length(1, 500, { context: { code: StatusCode.LENGTH } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Overview',
    minLength: 10,
    maxLength: 2000,
    example: 'Example overview of the movie collection'
  })
  @Type(() => String)
  @Length(10, 2000, { context: { code: StatusCode.LENGTH } })
  overview: string;
}
