import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { catchError, map, mergeMap, Observable, of, throwError } from 'rxjs';

import { AuthUserDto } from '../../resources/users';
import { RateLimitOptions } from '../../decorators/rate-limit-options.decorator';
import { Redis2ndCacheService } from '../modules/redis-2nd-cache/redis-2nd-cache.service';
import { CachePrefix, StatusCode } from '../../enums';

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
    const key = `${CachePrefix.RATE_LIMIT}:${id}:${req.url}:${req.method}:${catchMode}`;

    const totalRequests = await this.redis2ndCacheService.get<number>(key) || 0;
    if (totalRequests >= limit) {
      const retryAfterSeconds = await this.redis2ndCacheService.ttl(key);
      if (continueWithCaptcha) {
        // Check if body contain the 'captcha' field
        if (!(<any>req.body).captcha) {
          throw new HttpException({
            code: StatusCode.TOO_MANY_REQUESTS_CAPTCHA,
            message: 'Too many requests, please verify the captcha to continue',
            continueWithCaptcha: true,
            ttl: retryAfterSeconds
          }, HttpStatus.TOO_MANY_REQUESTS);
        }
      } else if (retryAfterSeconds > 0) {
        throw new HttpException({
          code: StatusCode.TOO_MANY_REQUESTS_TTL,
          message: 'Too many requests, please try again later',
          ttl: retryAfterSeconds
        }, HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    if (catchMode === 'success') {
      return next.handle().pipe(mergeMap(res => this.redis2ndCacheService.set(key, totalRequests + 1, { ttl }).then(() => res)));
    }

    return next.handle().pipe(
      // If there is a error
      catchError((error: HttpException) => {
        const status = error.getStatus();
        if (status >= 400 && status <= 499 && status !== 429) {
          return of(this.redis2ndCacheService.set(key, totalRequests + 1, { ttl })).pipe(mergeMap(() => throwError(() => error)));
          /*
          return of(this.redis2ndCacheService.set(key, totalRequests + 1, { ttl })).pipe(mergeMap(() => throwError(() => {
            const response = error.getResponse();
            if (typeof response === 'string')
              return new HttpException(response, error.getStatus());
            else {
              const canContinueWithCaptcha = continueWithCaptcha && (totalRequests + 1 >= limit);
              return new HttpException({
                ...response,
                continueWithCaptcha: canContinueWithCaptcha
              }, error.getStatus());
            }
          })));
          */
        }
        return throwError(() => error);
      }),
      // If there are no errors, remove the rate limit counter
      mergeMap(res => of(this.redis2ndCacheService.del(key)).pipe(map(() => res)))
    )
  }
}
