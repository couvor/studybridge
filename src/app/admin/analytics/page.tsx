import { requireRole } from "@/lib/auth";
import {
  readSiteTotal,
  summarizeSiteTotal,
  formatTraffic,
  formatNum,
} from "@/lib/siteTotal";
import TrendChart from "@/components/TrendChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "流量分析 · 学桥运营后台" };

function delta(a: number, b: number | null): number | null {
  if (b == null || b === 0) return null;
  return ((a - b) / b) * 100;
}

export default async function AdminAnalyticsPage() {
  await requireRole("ADMIN");
  const days = readSiteTotal();
  const sum = summarizeSiteTotal(days);
  const labels = days.map((d) => d.date);
  const hasData = days.length > 0;
  const latest = sum.latest;
  const prev = sum.prev;

  return (
    <div className="space-y-10">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">
          Traffic / 流量分析
        </p>
        <h1 className="font-serifcn font-black text-3xl mt-3">站点访问趋势</h1>
        <p className="text-[13px] text-mute mt-3">
          数据来自 site_total 每日汇总（共 {sum.count} 天）。UV/IP 为各日独立数，累计值非跨日去重；
          数据每日 08:40 落盘，当日含内存增量。
        </p>
      </div>

      {!hasData && (
        <div className="card p-10 text-center text-dim">
          暂无可读取的访问统计数据（site_total 缓存未生成）。
        </div>
      )}

      {hasData && latest && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 border-x border-t border-line divide-x divide-line">
            {[
              { label: "UV（当日）", en: "UV", v: latest.uv, d: delta(latest.uv, prev?.uv ?? null) },
              { label: "IP（当日）", en: "IP", v: latest.ip, d: delta(latest.ip, prev?.ip ?? null) },
              { label: "PV（当日）", en: "PV", v: latest.pv, d: delta(latest.pv, prev?.pv ?? null) },
              { label: "请求（当日）", en: "REQUESTS", v: latest.request, d: delta(latest.request, prev?.request ?? null) },
              { label: "流量（当日）", en: "TRAFFIC", v: formatTraffic(latest.traffic), d: null },
            ].map((k) => (
              <div key={k.en} className="p-6 border-b border-line">
                <p className="stat-num !text-[clamp(1.8rem,3vw,2.6rem)]">
                  {typeof k.v === "number" ? formatNum(k.v) : k.v}
                </p>
                <p className="mono text-[9px] tracking-[0.2em] text-dim mt-3 leading-relaxed">
                  {k.label} / {k.en}
                </p>
                {k.d != null && (
                  <p
                    className={`mono text-[10px] mt-2 ${
                      k.d >= 0 ? "text-[#5eb96b]" : "text-[#e0666a]"
                    }`}
                  >
                    {k.d >= 0 ? "▲" : "▼"} {Math.abs(k.d).toFixed(1)}% 环比
                  </p>
                )}
              </div>
            ))}
          </div>

          <section className="card-2 p-6 space-y-2">
            <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-2">
              UV / IP 趋势
            </p>
            <TrendChart
              labels={labels}
              series={[
                { name: "UV", color: "var(--accent)", values: days.map((d) => d.uv) },
                { name: "IP", color: "var(--accent-soft)", values: days.map((d) => d.ip) },
              ]}
            />
          </section>

          <section className="card-2 p-6 space-y-2">
            <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-2">
              PV / 请求 趋势
            </p>
            <TrendChart
              labels={labels}
              series={[
                { name: "PV", color: "var(--accent)", values: days.map((d) => d.pv) },
                { name: "请求", color: "var(--accent-soft)", values: days.map((d) => d.request) },
              ]}
            />
          </section>

          <section className="card-2 p-6 space-y-2">
            <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-2">
              流量趋势
            </p>
            <TrendChart
              labels={labels}
              series={[
                { name: "流量", color: "var(--accent)", values: days.map((d) => d.traffic) },
              ]}
            />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 card p-6">
              <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase">
                区间汇总
              </p>
              <dl className="mt-4 space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-mute">天数</dt>
                  <dd className="mono">{sum.count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">累计请求</dt>
                  <dd className="mono">{formatNum(sum.total.request)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">累计流量</dt>
                  <dd className="mono">{formatTraffic(sum.total.traffic)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">日均请求</dt>
                  <dd className="mono">{formatNum(Math.round(sum.dailyAvg.request))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">日均流量</dt>
                  <dd className="mono">{formatTraffic(sum.dailyAvg.traffic)}</dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-9 card overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>UV</th>
                    <th>IP</th>
                    <th>PV</th>
                    <th>请求</th>
                    <th>流量</th>
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((d) => (
                    <tr key={d.date}>
                      <td className="mono text-[12px]">{d.date}</td>
                      <td className="mono text-[12px]">{formatNum(d.uv)}</td>
                      <td className="mono text-[12px]">{formatNum(d.ip)}</td>
                      <td className="mono text-[12px]">{formatNum(d.pv)}</td>
                      <td className="mono text-[12px]">{formatNum(d.request)}</td>
                      <td className="mono text-[12px] text-dim">{formatTraffic(d.traffic)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
