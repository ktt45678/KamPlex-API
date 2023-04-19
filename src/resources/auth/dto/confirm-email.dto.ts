import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class ConfirmEmailDto {
  @ApiProperty({
    type: String,
    description: 'User id',
    example: '348415675948404736'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  id: bigint;

  @ApiProperty({
    type: String,
    description: 'Activation code',
    example: 'S0WauzTkv-qh_YWrwgIRW'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  activationCode: string;
}
