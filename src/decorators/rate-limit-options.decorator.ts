import { SetMetadata } from '@nestjs/common';

export const RateLimitOptions = (rateLimitOptions: RateLimitOptions) => SetMetadata('rateLimitOptions', rateLimitOptions);

export interface RateLimitOptions {
  catchMode?: 'success' | 'error';
  ttl?: number;
  limit?: number;
  continueWithCaptcha?: boolean;
}