import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class RemoveCollectionsDto {
  @ApiProperty({
    type: [String],
    description: 'Collection ids',
    required: true,
    example: ['268016436369163264']
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @Transform(({ value }) => !Array.isArray(value) ? [value] : value, { toClassOnly: true })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  ids: bigint[];
}
