import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { reviewDemandAction } from "@/app/actions/admin";
import { DEMAND_STATUS, REVIEW_STATUS, MODE_LABEL, fmtDate } from "@/lib/constants";

export const metadata = { title: "需求审核 · 学桥" };

export default async function AdminDemandsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; done?: string; error?: string }>;
}) {
  await requireRole("ADMIN");
  const { r, done, error } = await searchParams;
  const filter = r && ["PENDING", "APPROVED", "REJECTED"].includes(r) ? r : undefined;

  const demands = await db.demand.findMany({
    where: filter ? { reviewStatus: filter } : undefined,
    include: { subject: true, parent: true, _count: { select: { applications: true } } },
    orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Demands / 需求审核</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">求教单队列</h1>
        <p className="text-[13px] text-mute mt-2">检查信息完整性、有无敏感信息与违规内容。通过后进入教员端需求大厅。</p>
      </div>

      {done && (
        <div className="card-2 border-l-2 !border-l-accent px-5 py-4">
          <p className="text-[13.5px]">
            {done === "approve" ? "已通过审核，求教单已进入需求大厅。" : "已驳回，结果已通知家长。"}
          </p>
        </div>
      )}
      {error && (
        <div className="card-2 border-l-2 !border-l-[#e0666a] px-5 py-4">
          <p className="text-[13.5px]">操作未生效：该条目可能已被其他管理员处理。</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/demands" className={`btn btn-sm ${!filter ? "btn-primary" : ""}`}>全部</Link>
        <Link href="/admin/demands?r=PENDING" className={`btn btn-sm ${filter === "PENDING" ? "btn-primary" : ""}`}>待审核</Link>
        <Link href="/admin/demands?r=APPROVED" className={`btn btn-sm ${filter === "APPROVED" ? "btn-primary" : ""}`}>已通过</Link>
        <Link href="/admin/demands?r=REJECTED" className={`btn btn-sm ${filter === "REJECTED" ? "btn-primary" : ""}`}>未通过</Link>
      </div>

      <div className="space-y-4">
        {demands.length === 0 && <div className="card py-12 text-center text-[13.5px] text-dim">没有符合条件的求教单</div>}
        {demands.map((d) => (
          <div key={d.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="mono text-[11px] text-dim">{d.code}</span>
                  <h3 className="font-serifcn text-[16px] font-semibold">{d.subject.name} · {d.learnerGrade}</h3>
                  <span className={REVIEW_STATUS[d.reviewStatus]?.cls}>{REVIEW_STATUS[d.reviewStatus]?.label}</span>
                  <span className={DEMAND_STATUS[d.status]?.cls}>{DEMAND_STATUS[d.status]?.label}</span>
                </div>
                <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
                  {d.parent.name} · {MODE_LABEL[d.mode]}{d.region && ` · ${d.region}`} · {fmtDate(d.createdAt)} · {d._count.applications} 份报名
                </p>
                {d.description && <p className="text-[13px] leading-[1.9] text-mute mt-2.5 max-w-2xl">{d.description}</p>}
                {(d.frequency || d.budgetNote) && (
                  <p className="text-[12.5px] text-dim mt-1.5">
                    {d.frequency && `频次：${d.frequency}`}
                    {d.frequency && d.budgetNote && " · "}
                    {d.budgetNote && `预算：${d.budgetNote}`}
                  </p>
                )}
              </div>
              {d.reviewStatus === "PENDING" && (
                <form action={reviewDemandAction} className="card-2 p-4 space-y-3 w-full sm:w-64 shrink-0">
                  <input type="hidden" name="demandId" value={d.id} />
                  <input name="note" className="input !text-[13px]" placeholder="驳回理由（驳回时填写）" />
                  <div className="flex gap-2">
                    <button name="decision" value="APPROVE" className="btn btn-sm btn-primary flex-1">通过</button>
                    <button name="decision" value="REJECT" className="btn btn-sm btn-danger flex-1">驳回</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
