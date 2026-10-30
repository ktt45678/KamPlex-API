import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { getRedisTtlSeconds } from './redis-keyv.util';

@Injectable()
export class RedisCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl && ttl * 1000);
  }

  wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    return this.cacheManager.wrap<T>(key, fn, ttl && ttl * 1000);
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  del(key: string): Promise<boolean> {
    return this.cacheManager.del(key);
  }

  ttl(key: string): Promise<number> {
    return getRedisTtlSeconds(this.cacheManager, key);
  }

  async reset(): Promise<void> {
    await this.cacheManager.clear();
  }
}
