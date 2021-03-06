import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class ConfirmEmailDto {
  @ApiProperty({
    type: String,
    description: 'User id',
    example: '348415675948404736'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Activation code',
    example: 'S0WauzTkv-qh_YWrwgIRW'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  activationCode: string;
}
