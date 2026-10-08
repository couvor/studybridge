import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DEMAND_STATUS, REVIEW_STATUS, fmtDate } from "@/lib/constants";

export const metadata = { title: "我的需求 · 学桥" };

export default async function ParentDemandsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const s = await requireRole("PARENT");
  const { status } = await searchParams;
  const valid = status && ["OPEN", "MATCHED", "CLOSED"].includes(status) ? status : undefined;

  const demands = await db.demand.findMany({
    where: { parentId: s.uid, ...(valid ? { status: valid } : {}) },
    include: { subject: true, _count: { select: { applications: { where: { status: "PENDING" } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Demands / 我的需求</p>
          <h1 className="font-serifcn font-black text-3xl mt-3">求教单</h1>
        </div>
        <Link href="/parent/demands/new" className="btn btn-primary btn-sm">＋ 发布新需求</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/parent/demands" className={`btn btn-sm ${!valid ? "btn-primary" : ""}`}>全部</Link>
        <Link href="/parent/demands?status=OPEN" className={`btn btn-sm ${valid === "OPEN" ? "btn-primary" : ""}`}>撮合中</Link>
        <Link href="/parent/demands?status=MATCHED" className={`btn btn-sm ${valid === "MATCHED" ? "btn-primary" : ""}`}>已成单</Link>
        <Link href="/parent/demands?status=CLOSED" className={`btn btn-sm ${valid === "CLOSED" ? "btn-primary" : ""}`}>已关闭</Link>
      </div>

      <div className="border-t border-line-strong">
        {demands.length === 0 && (
          <div className="py-16 text-center border-b border-line">
            <p className="text-[13.5px] text-dim mb-4">这里还空着</p>
            <Link href="/parent/demands/new" className="btn btn-sm">发布第一条需求</Link>
          </div>
        )}
        {demands.map((d) => (
          <Link key={d.id} href={`/parent/demands/${d.id}`} className="row-item group">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="mono text-[11px] text-dim">{d.code}</span>
                <span className="font-serifcn text-[16px] font-semibold group-hover:text-accent-soft transition-colors">
                  {d.subject.name}
                </span>
                <span className="text-[13px] text-dim">· {d.learnerGrade}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={REVIEW_STATUS[d.reviewStatus]?.cls}>{REVIEW_STATUS[d.reviewStatus]?.label}</span>
                <span className={DEMAND_STATUS[d.status]?.cls}>{DEMAND_STATUS[d.status]?.label}</span>
              </div>
            </div>
            <p className="text-[13px] text-mute mt-2 line-clamp-1 max-w-2xl">{d.description || "（无补充说明）"}</p>
            <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
              {fmtDate(d.createdAt)}
              {d.status === "OPEN" && d._count.applications > 0 && (
                <span className="text-accent-soft ml-3">● {d._count.applications} 份新报名待确认</span>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
