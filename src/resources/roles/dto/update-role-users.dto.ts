import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray } from 'class-validator';
import { StatusCode } from '../../../enums/status-code.enum';

export class UpdateRoleUsersDto {
  @ApiProperty({
    type: [String],
    description: 'Array of user ids'
  })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  userIds: string[];
}