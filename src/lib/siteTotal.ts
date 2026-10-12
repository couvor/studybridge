import fs from "node:fs";
import path from "node:path";

export interface DayStat {
  date: string;
  uv: number;
  ip: number;
  pv: number;
  request: number;
  traffic: number;
}

export interface SiteTotalSummary {
  days: DayStat[];
  count: number;
  latest: DayStat | null;
  prev: DayStat | null;
  total: { uv: number; ip: number; pv: number; request: number; traffic: number };
  dailyAvg: { uv: number; ip: number; pv: number; request: number; traffic: number };
}

// 由 root 定时从 site_total 复制而来（www 可读），见 site_total_cache.{service,timer}
const CACHE_DIR =
  process.env.SITE_TOTAL_CACHE_DIR ||
  "/www/wwwroot/studybridge/.cache/site_total";

export function readSiteTotal(): DayStat[] {
  try {
    if (!fs.existsSync(CACHE_DIR)) return [];
    const files = fs
      .readdirSync(CACHE_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();
    const out: DayStat[] = [];
    for (const f of files) {
      const raw = fs.readFileSync(path.join(CACHE_DIR, f), "utf-8");
      const j = JSON.parse(raw);
      out.push({
        date: f.replace(/\.json$/, ""),
        uv: Number(j.uv) || 0,
        ip: Number(j.ip) || 0,
        pv: Number(j.pv) || 0,
        request: Number(j.request) || 0,
        traffic: Number(j.traffic) || 0,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function summarizeSiteTotal(days: DayStat[]): SiteTotalSummary {
  const total = days.reduce(
    (a, s) => {
      a.uv += s.uv;
      a.ip += s.ip;
      a.pv += s.pv;
      a.request += s.request;
      a.traffic += s.traffic;
      return a;
    },
    { uv: 0, ip: 0, pv: 0, request: 0, traffic: 0 }
  );
  const n = days.length || 1;
  return {
    days,
    count: days.length,
    latest: days[days.length - 1] ?? null,
    prev: days[days.length - 2] ?? null,
    total,
    dailyAvg: {
      uv: total.uv / n,
      ip: total.ip / n,
      pv: total.pv / n,
      request: total.request / n,
      traffic: total.traffic / n,
    },
  };
}

export function formatTraffic(bytes: number): string {
  let n = bytes;
  for (const u of ["B", "KB", "MB", "GB", "TB"]) {
    if (n < 1024 || u === "TB") {
      return `${u === "B" ? n.toFixed(0) : n.toFixed(1)} ${u}`;
    }
    n /= 1024;
  }
  return `${n.toFixed(1)} TB`;
}

export function formatNum(n: number): string {
  return n.toLocaleString("zh-CN");
}
