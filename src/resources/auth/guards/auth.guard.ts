import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';

import { AuthOptions } from '../../../decorators/auth-guard-options.decorator';
import { StatusCode } from '../../../enums/status-code.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private authService: AuthService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authGuardOptions = this.reflector.get<AuthOptions>('authGuardOptions', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const accessToken = request.headers.authorization;
    if (!accessToken) {
      if (authGuardOptions.anonymous) {
        request.isAnonymous = true;
        return true;
      }
      throw new HttpException({ code: StatusCode.NULL_AUTHORIZATION, message: 'Access token is empty' }, HttpStatus.UNAUTHORIZED);
    }
    try {
      const payload = await this.authService.verifyAccessToken(accessToken);
      request.user = payload;
      return true;
    } catch (e) {
      throw new HttpException({ code: StatusCode.UNAUTHORIZED, message: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }
  }
}
