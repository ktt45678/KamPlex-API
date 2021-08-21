import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SettingsService } from '../../settings/settings.service';
import { PermissionsService } from '../../../common/permissions/permissions.service';
import { PermissionOptions } from '../../../decorators/roles-guard-options.decorator';
import { AuthUserDto } from '../../users/dto/auth-user.dto';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private settingsService: SettingsService, private permissionsService: PermissionsService) { }

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
    user.isOwner = await this.settingsService.isOwner(user);
    if (user.isOwner) {
      user.hasPermission = true;
      return true;
    } else if (options.requireOwner)
      return false;
    // Check permissions
    user.hasPermission = this.permissionsService.hasPermission(user, options.permissions);
    if (user.hasPermission)
      return true;
    // If not qualified
    if (options.throwError)
      return false;
    return true;
  }
}