import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray } from 'class-validator';

import { StatusCode } from '../../../enums';

export class UpdateMediaProductionsDto {
  @ApiProperty({
    type: [String],
    description: 'Ids of productions',
    default: [],
    example: []
  })
  @Transform(({ value }) => BigInt(value))
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  productions: bigint[];
}
