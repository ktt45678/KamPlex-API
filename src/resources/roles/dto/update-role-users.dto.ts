import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';
import { StatusCode } from '../../../enums/status-code.enum';

export class UpdateRoleUsersDto {
  @ApiProperty({
    type: [String],
    description: 'Array of user ids',
    example: ['349433401473762304', '349543877406884864']
  })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @ArrayUnique(value => value, { context: { code: StatusCode.ARRAY_UNIQUE } })
  userIds: string[];
}