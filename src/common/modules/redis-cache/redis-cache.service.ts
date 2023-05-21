import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache, CachingConfig, WrapArgsType } from 'cache-manager';

@Injectable()
export class RedisCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  set<T>(key: string, value: T, options?: CachingConfig): Promise<T> {
    return this.cacheManager.set<T>(key, value, options);
  }

  wrap<T>(...args: WrapArgsType<T>[]): Promise<T> {
    return this.cacheManager.wrap<T>(...args);
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  del(key: string): Promise<any> {
    return this.cacheManager.del(key);
  }

  ttl(key: string): Promise<number> {
    return this.cacheManager.store.ttl(key);
  }

  reset(): Promise<void> {
    return this.cacheManager.reset();
  }
}
