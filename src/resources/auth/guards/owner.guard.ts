import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { User } from '../../../schemas/user.schema';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private settingsService: SettingsService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const setting = await this.settingsService.findOneAndCache();
    if (user?._id === setting?.owner?._id)
      return true;
    return false;
  }
}
