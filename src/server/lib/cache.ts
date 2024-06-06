import { createClient } from 'redis';
import { env } from '../../env';
const redis = createClient({
    url: env.REDIS_URL,
});


import superjson from 'superjson';

export async function writeToCache<T>(key: string, value: T) {
    const client = await redis.connect();
    return client.set(key,
        superjson.stringify(value),
    );
}

export async function readFromCache<T>(key: string): Promise<T | null> {
    const client = await redis.connect();
    const value = await client.get(key);
    if (!value) {
        return null;
    }
    return superjson.parse(value);
}