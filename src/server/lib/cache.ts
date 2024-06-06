import { RedisClientType, createClient } from 'redis';
import { env } from '../../env';
const client = createClient({
    url: env.REDIS_URL,
    socket: {
        connectTimeout: 30000,  // Increase the connection timeout to 10 seconds
    },
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

export async function deleteFromCache(key: string) {
    return client.del(key);
}