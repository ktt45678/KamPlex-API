import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Redis2ndCacheService } from './redis-2nd-cache.service';
import { createRedisKeyv } from '../redis-cache/redis-keyv.util';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisKeyv = await createRedisKeyv(configService.get<string>('REDIS_2ND_URL'));
        return { stores: [redisKeyv] };
      }
    })
  ],
  providers: [Redis2ndCacheService],
  exports: [CacheModule, Redis2ndCacheService]
})
export class Redis2ndCacheModule { }
