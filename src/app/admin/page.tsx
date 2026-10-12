import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  readSiteTotal,
  summarizeSiteTotal,
  formatTraffic,
  formatNum,
} from "@/lib/siteTotal";

export default async function AdminHome() {
  await requireRole("ADMIN");

  const site = summarizeSiteTotal(readSiteTotal());
  const latestSite = site.latest;

  const [pendingAudits, pendingDemands, openDemands, activeOrders, finishedOrders, tutorTotal, parentTotal] =
    await Promise.all([
      db.tutorProfile.count({ where: { auditStatus: "PENDING" } }),
      db.demand.count({ where: { reviewStatus: "PENDING" } }),
      db.demand.count({ where: { status: "OPEN", reviewStatus: "APPROVED" } }),
      db.order.count({ where: { status: "ACTIVE" } }),
      db.order.count({ where: { status: "FINISHED" } }),
      db.tutorProfile.count({ where: { auditStatus: "APPROVED" } }),
      db.user.count({ where: { role: "PARENT" } }),
    ]);

  const queue = [
    { label: "认证审核", en: "TUTOR AUDITS", num: pendingAudits, href: "/admin/audits" },
    { label: "需求审核", en: "DEMAND REVIEWS", num: pendingDemands, href: "/admin/demands" },
  ];

  const stats = [
    { label: "认证教员", en: "TUTORS", num: tutorTotal },
    { label: "家长用户", en: "PARENTS", num: parentTotal },
    { label: "撮合中需求", en: "OPEN DEMANDS", num: openDemands },
    { label: "进行中撮合", en: "ACTIVE ORDERS", num: activeOrders },
    { label: "完成撮合", en: "FINISHED", num: finishedOrders },
  ];

  return (
    <div className="space-y-10">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Dashboard / 看板</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">运营总览</h1>
      </div>

      {queue.some((q) => q.num > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {queue.filter((q) => q.num > 0).map((q) => (
            <Link key={q.en} href={q.href} className="card p-6 flex items-center justify-between group hover:border-line-strong transition-colors">
              <div>
                <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase">{q.en} / {q.label}</p>
                <p className="font-serifcn font-black text-2xl mt-2 text-accent-soft">{q.num} 项待处理</p>
              </div>
              <span className="mono text-dim group-hover:text-accent-soft transition-colors">→</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 border-x border-t border-line divide-x divide-line">
        {stats.map((st) => (
          <div key={st.en} className="p-6 border-b border-line">
            <p className="stat-num !text-[clamp(1.8rem,3vw,2.6rem)]">{st.num}</p>
            <p className="mono text-[9px] tracking-[0.2em] text-dim mt-3 leading-relaxed">{st.label} / {st.en}</p>
          </div>
        ))}
      </div>

      {latestSite && (
        <div className="card-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase">Site Traffic / 站点访问（site_total）</p>
            <Link href="/admin/analytics" className="mono text-[11px] text-accent-soft hover:underline">查看趋势 →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { l: "今日 UV", v: latestSite.uv },
              { l: "今日 IP", v: latestSite.ip },
              { l: "今日 PV", v: latestSite.pv },
              { l: "今日请求", v: latestSite.request },
              { l: "今日流量", v: formatTraffic(latestSite.traffic) },
            ].map((x) => (
              <div key={x.l}>
                <p className="stat-num !text-[clamp(1.5rem,2.4vw,2.1rem)]">{typeof x.v === "number" ? formatNum(x.v) : x.v}</p>
                <p className="mono text-[9px] tracking-[0.18em] text-dim mt-2">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-2 p-6">
        <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-3">Tips / 运营手册</p>
        <ul className="space-y-2 text-[13px] leading-[1.9] text-mute">
          <li>· 撮合质量即产品：需求审核后，可到「人工撮合」为家长直接推荐合适的认证教员。</li>
          <li>· 认证材料仅你与教员本人可见，核验时注意学生证姓名与注册姓名一致。</li>
          <li>· 现阶段全站免费（服务费 ¥0），未来切换一次性中介费只需调整 Order 的 feeType 字段。</li>
        </ul>
      </div>
    </div>
  );
}
