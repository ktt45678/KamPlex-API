import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { User } from '../../../schemas';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor() { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User & ExtraUserProperties = request.user;
    if (user.owner) {
      user.hasPermission = true;
      return true;
    }
    return false;
  }
}

class ExtraUserProperties {
  hasPermission: boolean;
}
