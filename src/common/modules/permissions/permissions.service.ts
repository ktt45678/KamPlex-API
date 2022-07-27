import { Injectable } from '@nestjs/common';
import { LeanDocument } from 'mongoose';

import { AuthUserDto } from '../../../resources/users';
import { User, Role } from '../../../schemas';
import { UserPermission } from '../../../enums';

@Injectable()
export class PermissionsService {
  hasPermission(user: AuthUserDto, permissions: number[]) {
    // If no role is required
    if (!permissions?.length)
      return true;
    // Returns false for users with no roles
    if (!user?.roles?.length)
      return false;
    // Administrators can bypass every permission
    if (user.roles.find(role => role.permissions & UserPermission.ADMINISTRATOR))
      return true;
    // Check every permission
    for (let i = 0; i < permissions.length; i++)
      if (user.roles.find(role => role.permissions & permissions[i]))
        return true;
    return false;
  }

  scanPermission(user: AuthUserDto | User | LeanDocument<User>) {
    const granted = [];
    if (!user?.roles?.length)
      return granted;
    const permKeys = Object.keys(UserPermission);
    for (let i = 0; i < permKeys.length; i++) {
      if (user.roles.find(role => role.permissions & UserPermission[permKeys[i]])) {
        granted.push(UserPermission[permKeys[i]]);
        continue;
      }
    }
    return granted;
  }

  canEditRole(authUser: AuthUserDto, targetRole: Role | LeanDocument<Role>) {
    if (authUser.owner)
      return true;
    if (!authUser.roles?.length)
      return false;
    const minPosition = Math.min.apply(Math, authUser.roles.map(o => o.position));
    // Cannot edit higher position role
    if (minPosition >= targetRole.position)
      return false;
    return true;
  }

  canEditPermissions(authUser: AuthUserDto, oldPermissions: number, newPermissions: number) {
    if (authUser.owner)
      return true;
    if (!authUser.granted?.length)
      return false;
    for (let i = 0; i < authUser.granted.length; i++) {
      if (authUser.granted[i] & oldPermissions)
        oldPermissions = oldPermissions ^ authUser.granted[i];
      if (authUser.granted[i] & newPermissions)
        newPermissions = newPermissions ^ authUser.granted[i];
      if (newPermissions === 0 && oldPermissions === 0)
        return true;
    }
    return false;
  }

  getHighestRolePosition(user: AuthUserDto | User | LeanDocument<User>) {
    if (user.owner)
      return 0;
    if (!user.roles?.length)
      return -1;
    return Math.min.apply(Math, user.roles.map((o: Role) => o.position));
  }
}
