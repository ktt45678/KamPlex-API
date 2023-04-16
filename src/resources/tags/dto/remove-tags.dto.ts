import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class RemoveTagsDto {
  @ApiProperty({
    type: [String],
    description: 'Tag ids',
    required: true,
    example: ['268016436369163264']
  })
  @Transform(({ value }) => BigInt(value))
  @Transform(({ value }) => !Array.isArray(value) ? [value] : value)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  ids: bigint[];
}
