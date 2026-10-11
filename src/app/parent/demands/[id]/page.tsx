import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { acceptApplicationAction, rejectApplicationAction, closeDemandAction } from "@/app/actions/demand";
import { DEMAND_STATUS, REVIEW_STATUS, APP_STATUS, MODE_LABEL, fmtDate } from "@/lib/constants";
import { Avatar, Stars } from "@/components/Atoms";

export default async function DemandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const s = await requireRole("PARENT");
  const { id } = await params;
  const { created } = await searchParams;

  const demand = await db.demand.findUnique({
    where: { id },
    include: {
      subject: true,
      applications: {
        include: { tutor: { include: { user: true, subjects: true } } },
        orderBy: { createdAt: "desc" },
      },
      orders: { include: { tutor: { include: { user: true } } } },
    },
  });
  if (!demand || demand.parentId !== s.uid) notFound();

  const pending = demand.applications.filter((a) => a.status === "PENDING");
  const others = demand.applications.filter((a) => a.status !== "PENDING");
  const activeOrder = demand.orders[0];

  const fields: Array<[string, string]> = [
    ["科目", demand.subject.name],
    ["学员年级", demand.learnerGrade],
    ["授课方式", MODE_LABEL[demand.mode]],
    ["地区", demand.region || "—"],
    ["频次", demand.frequency || "—"],
    ["预算备注", demand.budgetNote || "—"],
    ["发布时间", fmtDate(demand.createdAt)],
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      {created && (
        <div className="card-2 border-l-2 !border-l-accent px-5 py-4">
          <p className="text-[13.5px] leading-[1.8]">
            需求已提交，等待平台审核。审核通过后会进入教员端需求大厅，有教员报名时你会收到站内通知。
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Demand / 求教单</p>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <h1 className="font-serifcn font-black text-3xl">{demand.code}</h1>
            <span className={DEMAND_STATUS[demand.status]?.cls}>{DEMAND_STATUS[demand.status]?.label}</span>
            <span className={REVIEW_STATUS[demand.reviewStatus]?.cls}>{REVIEW_STATUS[demand.reviewStatus]?.label}</span>
          </div>
          {demand.reviewStatus === "REJECTED" && demand.auditNote && (
            <p className="text-[12.5px] text-[#e0666a] mt-2">审核意见：{demand.auditNote}</p>
          )}
        </div>
        <div className="flex gap-2">
          {demand.status === "OPEN" && (
            <form action={closeDemandAction}>
              <input type="hidden" name="demandId" value={demand.id} />
              <button className="btn btn-sm btn-danger">关闭需求</button>
            </form>
          )}
          {activeOrder && (
            <Link href={`/parent/orders/${activeOrder.id}`} className="btn btn-sm btn-primary">查看撮合单 →</Link>
          )}
        </div>
      </div>

      <div className="card p-7">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt className="mono text-[9px] tracking-[0.2em] text-dim uppercase mb-1.5">{k}</dt>
              <dd className="text-[13.5px] leading-[1.7]">{v}</dd>
            </div>
          ))}
        </dl>
        {demand.description && (
          <p className="mt-6 pt-6 border-t border-line text-[13.5px] leading-[2] text-mute whitespace-pre-line">
            {demand.description}
          </p>
        )}
      </div>

      {/* 待确认报名 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase">
            Applications / 报名（{pending.length} 待确认）
          </p>
          {demand.status === "OPEN" && (
            <Link href="/tutors" className="mono text-[10px] tracking-[0.15em] text-dim hover:text-accent-soft transition-colors">
              去教员库物色 →
            </Link>
          )}
        </div>

        {pending.length === 0 && demand.status === "OPEN" && (
          <div className="card py-12 text-center">
            <p className="text-[13.5px] text-dim">
              {demand.reviewStatus === "PENDING" ? "需求审核中，通过后教员即可报名" : "还没有教员报名，稍安勿躁"}
            </p>
          </div>
        )}
        {demand.status !== "OPEN" && pending.length === 0 && others.length === 0 && (
          <div className="card py-12 text-center">
            <p className="text-[13.5px] text-dim">本需求没有收到报名</p>
          </div>
        )}

        <div className="space-y-3">
          {[...pending, ...others].map((app) => {
            const t = app.tutor;
            return (
              <div key={app.id} className="card p-5 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Avatar name={t.user.name} size={48} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link href={`/tutors/${t.id}`} className="font-serifcn font-black text-lg link-slide">
                          {t.user.name}
                        </Link>
                        {t.auditStatus === "APPROVED" ? (
                          <span className="badge badge-ok">已认证</span>
                        ) : (
                          <span className="badge">重新核验中</span>
                        )}
                        <span className={APP_STATUS[app.status]?.cls}>{APP_STATUS[app.status]?.label}</span>
                      </div>
                      <p className="text-[12.5px] text-dim mt-1">
                        {t.university} · {t.major} · {t.grade} · {MODE_LABEL[t.mode]}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Stars value={t.ratingAvg} size="sm" />
                        <span className="mono text-[11px] text-dim">{t.ratingAvg.toFixed(1)}（{t.ratingCount}）</span>
                      </div>
                      {app.message && (
                        <p className="text-[13px] leading-[1.9] text-mute mt-3 border-l-2 border-line-strong pl-3.5">
                          {app.message}
                        </p>
                      )}
                      <p className="mono text-[9px] tracking-[0.15em] text-dim mt-3">APPLIED {fmtDate(app.createdAt)}</p>
                    </div>
                  </div>
                  {app.status === "PENDING" && demand.status === "OPEN" && (
                    <div className="flex lg:flex-col gap-2 shrink-0">
                      <form action={acceptApplicationAction}>
                        <input type="hidden" name="applicationId" value={app.id} />
                        <button className="btn btn-sm btn-primary w-full lg:w-auto">接受报名</button>
                      </form>
                      <form action={rejectApplicationAction}>
                        <input type="hidden" name="applicationId" value={app.id} />
                        <button className="btn btn-sm btn-ghost">婉拒</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
