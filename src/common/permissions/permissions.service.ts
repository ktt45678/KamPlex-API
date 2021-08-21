import { Injectable } from '@nestjs/common';

import { UserPermission } from '../../enums/user-permission.enum';
import { AuthUserDto } from '../../resources/users/dto/auth-user.dto';

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
}
