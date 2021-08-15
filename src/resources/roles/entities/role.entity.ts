import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { Role as RoleModel } from '../../../schemas/role.schema';
import { User } from '../../users/entities/user.entity';

export class Role extends RoleModel {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  users: User[];

  @ApiProperty()
  permissions: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<Role>) {
    super();
    Object.assign(this, partial);
  }
}
