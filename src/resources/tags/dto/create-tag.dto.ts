import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, MaxLength } from 'class-validator';

import { StatusCode } from '../../../enums';

export class CreateTagDto {
  @ApiProperty({
    type: String,
    description: 'Tag name',
    maxLength: 32,
    example: 'Bluray'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(32, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;
}
