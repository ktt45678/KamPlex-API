import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

import { User } from '../../../schemas/user.schema';
import { StatusCode } from '../../../enums/status-code.enum';

export class UpdateSettingDto {
  @ApiProperty({
    type: String,
    description: 'Id of the new owner',
    example: '343990254685390848'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  owner: User;
}
