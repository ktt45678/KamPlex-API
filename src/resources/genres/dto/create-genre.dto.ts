import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class CreateGenreDto {
  @ApiProperty({
    type: String,
    description: 'Genre name, use array to add multiple names',
    maxLength: 32,
    example: 'Action'
  })
  @Type(() => String)
  @IsNotEmpty({ each: true, context: { code: StatusCode.IS_NOT_EMPTY } })
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @MaxLength(32, { each: true, context: { code: StatusCode.MAX_LENGTH } })
  name: string | string[];
}
