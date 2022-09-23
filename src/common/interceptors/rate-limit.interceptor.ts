import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { map, Observable, tap } from 'rxjs';

import { AuthUserDto } from '../../resources/users';
import { RateLimitOptions } from '../../decorators/rate-limit-options.decorator';
import { Redis2ndCacheService } from '../modules/redis-2nd-cache/redis-2nd-cache.service';
import { StatusCode } from '../../enums';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {

  constructor(private reflector: Reflector, private redis2ndCacheService: Redis2ndCacheService) { }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const options = this.reflector.get<RateLimitOptions>('rateLimitOptions', context.getHandler());
    const catchMode = options?.catchMode || 'success';
    const ttl = options?.ttl || 120;
    const limit = options?.limit || 1;
    const continueWithCaptcha = options?.continueWithCaptcha || false;

    const contextHttp = context.switchToHttp();
    const req = contextHttp.getRequest<FastifyRequest & { user: AuthUserDto }>();
    const id = req.user?._id || req.ip;
    const key = `${id}:${req.url}:${req.method}:${catchMode}`;

    const value = await this.redis2ndCacheService.get<number>(key) || 0;
    if (limit > value) {
      const ttl = await this.redis2ndCacheService.ttl(key);
      if (ttl > 0) {
        throw new HttpException({
          code: StatusCode.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          ttl: ttl
        }, HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    return next.handle();
  }
}