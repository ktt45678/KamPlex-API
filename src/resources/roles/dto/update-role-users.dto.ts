import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray } from 'class-validator';

import { StatusCode } from '../../../enums';

export class UpdateRoleUsersDto {
  @ApiProperty({
    type: [String],
    description: 'Array of user ids',
    example: ['349433401473762304', '349543877406884864']
  })
  @Transform(({ value }) => BigInt(value))
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  userIds: bigint[];
}
