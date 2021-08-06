import { Exclude } from 'class-transformer';
import { User as UserModel } from '../../../schemas/user.schema';
import { UserCode } from '../../../schemas/user-code.schema';
import { UserFile } from '../../../schemas/user-file.schema';

export class User extends UserModel {
  @Exclude()
  password: string;

  @Exclude()
  codes: UserCode;

  @Exclude()
  files: UserFile[];

  @Exclude()
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}
