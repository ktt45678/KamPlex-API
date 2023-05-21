import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, MaxLength } from 'class-validator';

import { StatusCode } from '../../../enums';

export class CreateChapterTypeDto {
  @ApiProperty({
    type: String,
    description: 'Chapter name',
    example: 'Intro'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(50, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;
}
