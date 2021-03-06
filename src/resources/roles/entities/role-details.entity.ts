import { ApiProperty } from '@nestjs/swagger';

import { Role } from './role.entity';

export class RoleDetails extends Role {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
