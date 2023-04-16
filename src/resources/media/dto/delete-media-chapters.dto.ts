import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class DeleteMediaChaptersDto {
  @ApiProperty({
    type: [String],
    description: 'Chapter ids',
    required: true,
    example: ['268016436369163264']
  })
  @Transform(({ value }) => BigInt(value))
  @Transform(({ value }) => !Array.isArray(value) ? [value] : value)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  @ArrayNotEmpty({ context: { code: StatusCode.ARRAY_NOT_EMPTY } })
  ids: bigint[];
}
