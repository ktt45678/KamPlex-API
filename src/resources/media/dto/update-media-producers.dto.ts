import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

import { StatusCode } from '../../../enums';

export class UpdateMediaProducersDto {
  @ApiProperty({
    type: [String],
    description: 'Ids of producers',
    default: [],
    example: []
  })
  @Type(() => String)
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  producers: string[];
}