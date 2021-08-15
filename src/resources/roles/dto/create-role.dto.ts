import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

import { StatusCode } from 'src/enums/status-code.enum';
import { UserPermission } from 'src/enums/user-permission.enum';

export class CreateRoleDto {
  @ApiProperty({
    type: String,
    description: 'Role name',
    maxLength: 100,
    example: 'mini admin'
  })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(100, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: Number,
    description: 'Color of the role in decimal',
    required: false,
    example: 4095
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  @IsInt({ context: { code: StatusCode.IS_INT } })
  color?: number;

  @ApiProperty({
    type: Number,
    description: `Permissions = 0: Normal users<br/>
    Permissions = ${UserPermission.ADMINISTRATOR}: Can do anything<br/>
    Permissions = ${UserPermission.MANAGE_MEDIA}: Can manage media<br/>
    Permissions = ${UserPermission.MANAGE_ROLES}: Can manage roles<br/>
    Permissions = ${UserPermission.BAN_USERS}: Can ban users`,
    required: false,
    example: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  permissions?: number;
}
