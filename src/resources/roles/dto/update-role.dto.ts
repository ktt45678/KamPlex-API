import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

import { CreateRoleDto } from './create-role.dto';
import { StatusCode } from '../../../enums';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiProperty({
    type: Number,
    description: 'Position of the role',
    minimum: 1,
    required: false,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  position: number;
}
