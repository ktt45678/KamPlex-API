import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';
import { UserPermission } from '../../../enums/user-permission.enum';

export class CreateRoleDto {
  @ApiProperty({
    type: String,
    description: 'Role name',
    maxLength: 100,
    example: 'new role'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(100, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: Number,
    description: 'Color of the role in decimal',
    required: false,
    example: 4095
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  color: number;

  @ApiProperty({
    type: Number,
    description: `Permissions = 0: Normal users<br/>
    Permissions = ${UserPermission.ADMINISTRATOR}: Can do anything<br/>
    Permissions = ${UserPermission.MANAGE_MEDIA}: Can manage media<br/>
    Permissions = ${UserPermission.MANAGE_ROLES}: Can manage roles<br/>
    Permissions = ${UserPermission.MANAGE_USERS}: Can manage users`,
    required: false,
    example: 0
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  permissions: number;
}
