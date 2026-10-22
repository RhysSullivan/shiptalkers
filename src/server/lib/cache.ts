import { env } from "cloudflare:workers";
import superjson from "superjson";

function kv() {
    return env.CACHE;
}

// KV rejects TTLs under 60 seconds.
export async function writeToCache<T>(key: string, value: T, EX?: number) {
    if (EX) {
        return kv().put(key, superjson.stringify(value), { expirationTtl: Math.max(EX, 60) });
    }
    return kv().put(key, superjson.stringify(value));
}

export async function readFromCache<T>(key: string): Promise<T | null> {
    const value = await kv().get(key);
    if (!value) {
        return null;
    }
    return superjson.parse(value);
}

export async function deleteFromCache(key: string) {
    return kv().delete(key);
}
