import { RedisClientType, createClient } from 'redis';
import { env } from '../../env';
const redis = createClient({
    url: env.REDIS_URL,
});


import superjson from 'superjson';

let redisClient: RedisClientType;

async function getRedisClient() {
    if (!redisClient) {
        redisClient = createClient();
        await redisClient.connect();
    } else if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
}


export async function writeToCache<T>(key: string, value: T) {
    const client = await getRedisClient();
    return client.set(key,
        superjson.stringify(value),
    );
}

export async function readFromCache<T>(key: string): Promise<T | null> {
    const client = await getRedisClient();
    const value = await client.get(key);
    if (!value) {
        return null;
    }
    return superjson.parse(value);
}