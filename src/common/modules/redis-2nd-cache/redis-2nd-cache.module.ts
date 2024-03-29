import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ioRedisStore } from '@tirke/node-cache-manager-ioredis';

import { Redis2ndCacheService } from './redis-2nd-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: ioRedisStore,
        redisInstance: new Redis(configService.get<string>('REDIS_2ND_URL'))
      })
    })
  ],
  providers: [Redis2ndCacheService],
  exports: [CacheModule, Redis2ndCacheService]
})
export class Redis2ndCacheModule { }
