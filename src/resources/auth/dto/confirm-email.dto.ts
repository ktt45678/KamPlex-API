import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class ConfirmEmailDto {
  @ApiProperty({
    type: String,
    description: 'Activation code',
    example: 'S0WauzTkv-qh_YWrwgIRW'
  })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  activationCode: string;
}
