import { DiscoveryModule } from '@nestjs/core';
import { DynamicModule, Module, Provider } from '@nestjs/common';

import { RedisPubSubService } from './redis-pubsub.service';
import { RedisPubSubConfig } from './redis-pubsub-config.interface';
import { REDIS_PUBSUB_CONFIG } from './redis-pubsub.constants';

@Module({})
export class RedisPubSubModule {
  static register(config: RedisPubSubConfig): DynamicModule {
    return {
      imports: [DiscoveryModule],
      module: RedisPubSubModule,
      providers: [
        {
          provide: REDIS_PUBSUB_CONFIG,
          useValue: config
        },
        RedisPubSubService
      ],
      exports: [RedisPubSubService]
    };
  }

  static registerAsync(options: {
    useFactory: (...args: any[]) => Promise<RedisPubSubConfig> | RedisPubSubConfig;
    imports?: any[];
    inject?: any[];
  }): DynamicModule {
    const redisServiceProvider: Provider = {
      inject: options.inject || [],
      provide: REDIS_PUBSUB_CONFIG,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return config;
      },
    };

    return {
      module: RedisPubSubModule,
      imports: options.imports ? [DiscoveryModule, ...options.imports] : [DiscoveryModule],
      providers: [
        redisServiceProvider,
        RedisPubSubService
      ],
      exports: [RedisPubSubService],
    };
  }
}
