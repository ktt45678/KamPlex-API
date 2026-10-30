import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RedisCacheService } from './redis-cache.service';
import { createRedisKeyv } from './redis-keyv.util';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisKeyv = await createRedisKeyv(configService.get<string>('REDIS_URL'));
        return { stores: [redisKeyv] };
      }
    })
  ],
  providers: [RedisCacheService],
  exports: [CacheModule, RedisCacheService]
})
export class RedisCacheModule { }
