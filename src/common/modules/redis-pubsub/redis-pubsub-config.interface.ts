import Redis from 'ioredis';

export interface RedisPubSubConfig {
  redisInstance: Redis;
}
