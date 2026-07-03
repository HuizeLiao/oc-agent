import { createHash } from "crypto";
import type { NextRequest } from "next/server";

type RateLimitOptions = {
  action: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      resetSeconds: number;
    }
  | {
      allowed: false;
      error: string;
      remaining: number;
      resetSeconds: number;
    };

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function getRateLimitKey(req: NextRequest, action: string) {
  const ip = getClientIp(req);
  const hashedIp = hashIdentifier(ip);

  return `oc-agent:rate-limit:${action}:${hashedIp}`;
}

function getMissingConfigResult(): RateLimitResult {
  if (process.env.NODE_ENV !== "production") {
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      resetSeconds: 0,
    };
  }

  return {
    allowed: false,
    error: "用量限制还没有配置，请联系站点管理员。",
    remaining: 0,
    resetSeconds: 0,
  };
}

function getRetryMessage(resetSeconds: number) {
  const minutes = Math.max(1, Math.ceil(resetSeconds / 60));

  if (minutes >= 60) {
    const hours = Math.ceil(minutes / 60);

    return `今日生成次数已用完，请约 ${hours} 小时后再试。`;
  }

  return `生成次数太频繁，请约 ${minutes} 分钟后再试。`;
}

export async function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return getMissingConfigResult();
  }

  const key = getRateLimitKey(req, options.action);
  const res = await fetch(`${redisUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, options.windowSeconds, "NX"],
      ["TTL", key],
    ]),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Rate limit request failed:", res.status);
    return {
      allowed: false,
      error: "用量限制服务暂时不可用，请稍后再试。",
      remaining: 0,
      resetSeconds: 0,
    };
  }

  const data = await res.json();
  const count = Number(data?.[0]?.result || 0);
  const ttl = Number(data?.[2]?.result || options.windowSeconds);
  const remaining = Math.max(0, options.limit - count);

  if (count > options.limit) {
    return {
      allowed: false,
      error: getRetryMessage(ttl),
      remaining,
      resetSeconds: ttl,
    };
  }

  return {
    allowed: true,
    remaining,
    resetSeconds: ttl,
  };
}
