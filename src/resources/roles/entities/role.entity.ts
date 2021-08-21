import { ApiProperty } from '@nestjs/swagger';

import { User as UserModel } from '../../../schemas/user.schema';

export class Role {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  users: UserModel[];

  @ApiProperty()
  permissions: number;

  @ApiProperty()
  position: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<Role>) {
    Object.assign(this, partial);
  }
}
