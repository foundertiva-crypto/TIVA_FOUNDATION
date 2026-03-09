import { redis } from "./redis";

/**
 * Cache-aside helper using Upstash Redis.
 * If Redis is not configured, falls through to the fetcher directly.
 * If the key exists in cache, returns the cached value.
 * Otherwise, calls the fetcher, stores the result with TTL, and returns it.
 */
export async function cached<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
): Promise<T> {
    if (redis) {
        try {
            const cachedData = await redis.get<T>(key);
            if (cachedData !== null && cachedData !== undefined) {
                return cachedData;
            }
        } catch {
            // If Redis is down, fall through to fetcher
        }
    }

    const freshData = await fetcher();

    if (redis) {
        try {
            await redis.set(key, JSON.stringify(freshData), { ex: ttlSeconds });
        } catch {
            // If Redis is down, we still return fresh data
        }
    }

    return freshData;
}

/**
 * Invalidate a cache key (useful after mutations).
 */
export async function invalidateCache(key: string): Promise<void> {
    if (!redis) return;

    try {
        await redis.del(key);
    } catch {
        // Silently fail if Redis is down
    }
}
