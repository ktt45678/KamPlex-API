import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray } from 'class-validator';

import { StatusCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class UpdateMediaGenresDto {
  @ApiProperty({
    type: [String],
    description: 'Ids of genres',
    default: [],
    example: []
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  genres: bigint[];
}
