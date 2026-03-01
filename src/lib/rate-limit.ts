import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimitClient: Ratelimit | null = null;

export function getRateLimitClient(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!ratelimitClient) {
    const redis = new Redis({ url, token });

    ratelimitClient = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "smartnotes:api-rate-limit",
    });
  }

  return ratelimitClient;
}
