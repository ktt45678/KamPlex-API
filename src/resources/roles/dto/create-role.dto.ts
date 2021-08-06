import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

import { StatusCode } from 'src/enums/status-code.enum';

export class CreateRoleDto {
  @ApiProperty({
    type: String,
    description: 'Role name',
    maxLength: 100,
    example: 'new role',
  })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(100, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: Number,
    description: 'Color number in decimal',
    required: false,
    example: 4095
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ context: { code: StatusCode.IS_INT } })
  color?: number;

  @ApiProperty({
    type: Number,
    description: 'Permission number calculated by Bitwise OR (|)',
    example: 0
  })
  @IsInt({ context: { code: StatusCode.IS_INT } })
  permissions: number;
}
