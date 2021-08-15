import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { User as UserModel } from '../../../schemas/user.schema';
import { UserCode } from '../../../schemas/user-code.schema';
import { UserFile } from '../../../schemas/user-file.schema';
import { Role } from '../../roles/entities/role.entity';

export class User extends UserModel {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  birthdate: Date;

  @Exclude()
  password: string;

  @ApiProperty()
  roles: Role[];

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isBanned: boolean;

  @Exclude()
  codes: UserCode;

  @Exclude()
  files: UserFile[];

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}
