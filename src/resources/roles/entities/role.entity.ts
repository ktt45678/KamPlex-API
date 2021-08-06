import { Role as RoleModel } from '../../../schemas/role.schema';

export class Role extends RoleModel {
  constructor(partial: Partial<Role>) {
    super();
    Object.assign(this, partial);
  }
}
