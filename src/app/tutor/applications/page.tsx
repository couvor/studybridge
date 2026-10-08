import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withdrawApplicationAction } from "@/app/actions/tutor";
import { APP_STATUS, DEMAND_STATUS, MODE_LABEL, fmtDate } from "@/lib/constants";

export const metadata = { title: "我的报名 · 学桥" };

export default async function TutorApplicationsPage() {
  const s = await requireRole("TUTOR");
  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile) return null;

  const apps = await db.application.findMany({
    where: { tutorId: profile.id },
    include: {
      demand: { include: { subject: true, orders: { select: { id: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const orderIds = new Set(apps.flatMap((a) => a.demand.orders.map((o) => o.id)));

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Applications / 我的报名</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">报名记录</h1>
      </div>

      <div className="border-t border-line-strong">
        {apps.length === 0 && (
          <div className="py-16 text-center border-b border-line">
            <p className="text-[13.5px] text-dim mb-4">还没有报过名</p>
            <Link href="/tutor/demands" className="btn btn-sm">去需求大厅看看</Link>
          </div>
        )}
        {apps.map((a) => {
          const acceptedOrder = a.status === "ACCEPTED" ? a.demand.orders[0] : null;
          return (
            <div key={a.id} className="row-item">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="mono text-[11px] text-dim">{a.demand.code}</span>
                    <h3 className="font-serifcn text-[16px] font-semibold">{a.demand.subject.name} · {a.demand.learnerGrade}</h3>
                    <span className={APP_STATUS[a.status]?.cls}>{APP_STATUS[a.status]?.label}</span>
                    <span className={DEMAND_STATUS[a.demand.status]?.cls}>{DEMAND_STATUS[a.demand.status]?.label}</span>
                  </div>
                  {a.message && <p className="text-[13px] leading-[1.9] text-mute mt-2 max-w-2xl">「{a.message}」</p>}
                  <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
                    {fmtDate(a.createdAt)} 报名 · {MODE_LABEL[a.demand.mode]}
                    {a.demand.region && ` · ${a.demand.region}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {acceptedOrder && (
                    <Link href={`/tutor/orders/${acceptedOrder.id}`} className="btn btn-sm btn-primary">进入撮合单 →</Link>
                  )}
                  {a.status === "PENDING" && a.demand.status === "OPEN" && (
                    <form action={withdrawApplicationAction}>
                      <input type="hidden" name="applicationId" value={a.id} />
                      <button className="btn btn-sm btn-ghost">撤回</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
