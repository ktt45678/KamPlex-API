import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import Redis from 'ioredis';

import { ON_PUBSUB_MESSAGE_EVENT_METADATA, REDIS_PUBSUB_CONFIG } from './redis-pubsub.constants';
import { RedisPubSubConfig } from './redis-pubsub-config.interface';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  redis: Redis

  constructor(
    @Inject(REDIS_PUBSUB_CONFIG) public config: RedisPubSubConfig,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {
    this.redis = config.redisInstance;
  }

  async onModuleInit(): Promise<void> {
    // Subscribe to channels based on decorators
    const providers = this.discoveryService.getProviders();
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const instance = provider.instance;
      if (instance) {
        const prototype = Object.getPrototypeOf(instance);
        const methods = this.metadataScanner.getAllMethodNames(prototype);
        for (let j = 0; j < methods.length; j++) {
          const method = methods[j];
          const channelConfig = Reflect.getMetadata(ON_PUBSUB_MESSAGE_EVENT_METADATA, instance[method]);
          if (channelConfig) {
            await this.redis.subscribe(channelConfig.channel);
            this.redis.on('message', (subscribedChannel, message) => {
              if (subscribedChannel === channelConfig.channel) {
                instance[method](message); // Call the decorated method
              }
            });
          }
        }
      }
    }
  }

  onModuleDestroy() {
    this.redis.quit();
  }

  async publish(channel: string, message: string) {
    await this.redis.publish(channel, message);
  }

  async publishJson(channel: string, message: Object) {
    await this.redis.publish(channel, JSON.stringify(message));
  }
}
