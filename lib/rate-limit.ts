// in-memory fixed-window rate limiter

interface Window {
  count: number;
  resetAt: number; // epoch ms when the current window ends
}

const windows = new Map<string, Window>();
let lastSweep = Date.now();

// drop expired windows at most once per minute
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

// record one hit against key and report whether it stays within limit per windowMs.
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  if (process.env.RATE_LIMIT_DISABLED === "1") {
    return { ok: true, limit, remaining: limit, retryAfterSec: 0 };
  }

  const now = Date.now();
  sweep(now);

  let w = windows.get(key);
  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
  }
  w.count += 1;

  return {
    ok: w.count <= limit,
    limit,
    remaining: Math.max(0, limit - w.count),
    retryAfterSec: Math.ceil((w.resetAt - now) / 1000),
  };
}

// standard 429 with rate-limit headers, returned when rateLimit().ok is false
export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

// best-effort client IP from proxy headers, for limiting unauthenticated routes
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
