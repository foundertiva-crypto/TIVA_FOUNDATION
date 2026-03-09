import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

/**
 * Creates a rate limiter only if Redis is available.
 * Returns null if Redis is not configured.
 */
function createLimiter(
    maxRequests: number,
    window: Parameters<typeof Ratelimit.slidingWindow>[1],
    prefix: string
): Ratelimit | null {
    if (!redis) return null;

    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, window),
        prefix,
        analytics: true,
    });
}

/**
 * Check rate limit. If limiter is null (Redis not configured), always allows.
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string
): Promise<{ allowed: boolean }> {
    if (!limiter) return { allowed: true };

    try {
        const { success } = await limiter.limit(identifier);
        return { allowed: success };
    } catch {
        // If Redis is unreachable, allow the request through
        return { allowed: true };
    }
}

/** sendOtp — 3 req/min per IP */
export const authLimiter = createLimiter(3, "1 m", "ratelimit:auth");

/** verifyOtp — 5 req/min per IP */
export const verifyLimiter = createLimiter(5, "1 m", "ratelimit:verify");

/** registerWithReferral — 10 req/hr per user */
export const referralLimiter = createLimiter(10, "1 h", "ratelimit:referral");

/** startChallenge / restartChallenge — 5 req/hr per user */
export const challengeLimiter = createLimiter(5, "1 h", "ratelimit:challenge");

/** Global middleware — 100 req/min per IP */
export const globalLimiter = createLimiter(100, "1 m", "ratelimit:global");
