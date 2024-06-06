import { RedisClientType, createClient } from 'redis';
import { env } from '../../env';
const client = createClient({
    url: env.REDIS_URL,
});
void client.connect();

import superjson from 'superjson';



export async function writeToCache<T>(key: string, value: T) {
    return client.set(key,
        superjson.stringify(value),
    );
}

export async function readFromCache<T>(key: string): Promise<T | null> {
    const value = await client.get(key);
    if (!value) {
        return null;
    }
    return superjson.parse(value);
}