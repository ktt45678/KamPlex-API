import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, MaxLength } from 'class-validator';

import { StatusCode } from '../../../enums';

export class CreateGenreDto {
  @ApiProperty({
    type: String,
    description: 'Genre name',
    maxLength: 32,
    example: 'Action'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(32, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;
}
