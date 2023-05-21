import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as redisStore from 'cache-manager-ioredis';

import { RedisCacheService } from './redis-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        redisInstance: new Redis(configService.get<string>('REDIS_URL'))
      })
    })
  ],
  providers: [RedisCacheService],
  exports: [CacheModule, RedisCacheService]
})
export class RedisCacheModule { }
