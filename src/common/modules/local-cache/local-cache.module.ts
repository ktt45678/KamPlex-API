import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { LocalCacheService } from './local-cache.service';
import { CACHE_MEMORY_MAX, CACHE_MEMORY_TTL } from '../../../config';

@Module({
  imports: [
    CacheModule.register({
      store: 'memory',
      max: CACHE_MEMORY_MAX,
      ttl: CACHE_MEMORY_TTL * 1000
    })
  ],
  providers: [LocalCacheService],
  exports: [CacheModule, LocalCacheService]
})
export class LocalCacheModule { }
