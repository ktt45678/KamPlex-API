import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class LocalCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  set(key: string, value: unknown, ttl?: number): Promise<void> {
    return this.cacheManager.set(key, value, ttl);
  }

  wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    return this.cacheManager.wrap<T>(key, fn, ttl);
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  del(key: string): Promise<any> {
    return this.cacheManager.del(key);
  }

  reset(): Promise<void> {
    return this.cacheManager.reset();
  }
}
