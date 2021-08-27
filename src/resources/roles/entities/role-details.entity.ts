import { ApiProperty } from '@nestjs/swagger';

import { Role } from './role.entity';

export class RoleDetails extends Role {
  @ApiProperty()
  permissions: number;

  @ApiProperty()
  position: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
