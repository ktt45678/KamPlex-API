import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthOptions } from '../../../decorators/auth-guard-options.decorator';
import { StatusCode } from '../../../enums';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private reflector: Reflector, private authService: AuthService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authGuardOptions = this.reflector.get<AuthOptions>('authGuardOptions', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const accessToken = request.headers.authorization;
    if (!accessToken) {
      if (authGuardOptions?.anonymous) {
        request.user = { isAnonymous: true };
        return true;
      }
      throw new HttpException({ code: StatusCode.NULL_AUTHORIZATION, message: 'Access token is required' }, HttpStatus.UNAUTHORIZED);
    }
    try {
      const payload = await this.authService.verifyAccessToken(accessToken);
      const user = await this.authService.findUserAuthGuard(BigInt(payload._id));
      if (!user)
        throw new HttpException({ code: StatusCode.UNAUTHORIZED_NO_USER, message: 'Unauthorized (User no longer eixst)' }, HttpStatus.UNAUTHORIZED);
      if (user.banned)
        throw new HttpException({ code: StatusCode.USER_BANNED, message: 'You have been banned' }, HttpStatus.FORBIDDEN);
      request.user = user;
      request.user.isAnonymous = false;
      return true;
    } catch (e) {
      this.logger.error(e);
      if (e instanceof HttpException)
        throw e;
      throw new HttpException({ code: StatusCode.UNAUTHORIZED, message: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }
  }
}
