import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermissionOptions } from '../../../decorators/roles-guard-options.decorator';
import { AuthUserDto } from '../../users/dto/auth-user.dto';
import { UserPermission } from '../../../enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<PermissionOptions>('rolesGuardOptions', context.getHandler());
    if (!options)
      return true;
    const request = context.switchToHttp().getRequest();
    const user: AuthUserDto = request.user;
    // If user is empty
    if (!user)
      return false;
    user.hasPermission = false;
    // Returns true for anonymous users
    if (user.isAnonymous)
      return true;
    // Always allow the owner to pass
    if (user.owner) {
      user.hasPermission = true;
      return true;
    } else if (options.requireOwner) {
      if (options.throwError)
        return false;
    }
    // Check permissions
    user.hasPermission = user.granted.includes(UserPermission.ADMINISTRATOR) || user.granted.some(r => options.permissions.includes(r));
    if (user.hasPermission)
      return true;
    // If not qualified
    if (options.throwError)
      return false;
    return true;
  }
}