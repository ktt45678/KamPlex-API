import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class RemoveProductionsDto {
  @ApiProperty({
    type: [String],
    description: 'Production ids',
    required: true,
    example: ['268016436369163264']
  })
  @Type(() => String)
  @Transform(({ value }) => !Array.isArray(value) ? [value] : value)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  ids: string[];
}
