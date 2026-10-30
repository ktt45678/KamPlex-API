import { Cache } from 'cache-manager';

export async function createRedisKeyv(url: string) {
  const [{ Keyv }, { default: KeyvRedis }] = await Promise.all([import('keyv'), import('@keyv/redis')]);
  return new Keyv({
    store: new KeyvRedis(url),
    namespace: undefined,
    useKeyPrefix: false,
    serialize: data => JSON.stringify(data.value),
    deserialize: raw => ({ value: JSON.parse(raw) })
  });
}

// -2 means missing, -1 means never expires
export async function getRedisTtlSeconds(cache: Cache, key: string): Promise<number> {
  const { default: KeyvRedis } = await import('@keyv/redis');
  const store = cache.stores[0]?.store;
  if (!(store instanceof KeyvRedis))
    throw new Error('Redis cache store is not configured');
  const client = await store.getClient();
  return Number(await client.ttl(key));
}
