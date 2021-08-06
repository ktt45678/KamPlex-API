import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserPermission } from '../../../enums/user-permission.enum';
import { User } from '../../../schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const permissions = this.reflector.get<number[]>('permissions', context.getHandler());
    // If no role is required
    if (!permissions.length)
      return true;
    const request = context.switchToHttp().getRequest();
    // Returns true for anonymous users
    if (request.isAnonymous)
      return true;
    const user: User = request.user;
    // If user is empty
    if (!user)
      return false;
    // Always allow the owner to pass
    else if (user._id === '<id of the owner>')
      return true;
    // Returns false for users with no roles
    else if (!user.roles.length)
      return false;
    // Administrators can bypass every permission
    else if (user.roles.find(role => role.permissions & UserPermission.ADMINISTRATOR))
      return true;
    // Check every permission
    for (let i = 0; i < permissions.length; i++) {
      if (user.roles.find(role => role.permissions & permissions[i]))
        return true;
    }
    // If not qualified
    return false;
  }
}
