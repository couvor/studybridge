// 进程内固定窗口限流（单实例部署足够；多实例需换共享存储）。
// 返回 false 表示已超限，调用方应拒绝本次请求。

import { headers } from "next/headers";

const buckets = new Map<string, { count: number; resetAt: number }>();

// 周期性清理过期桶，防 Map 无限增长
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

// 取客户端 IP：nginx 反代已设置 X-Real-IP / X-Forwarded-For
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// 供 route handler（有 Request 对象）使用
export function clientIpFromReq(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
