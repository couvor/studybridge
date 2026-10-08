import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { applyToDemandAction } from "@/app/actions/tutor";
import { MODE_LABEL, CATEGORY_LABEL, CATEGORY_ORDER, fmtDate } from "@/lib/constants";

export const metadata = { title: "需求大厅 · 学桥" };

export default async function TutorDemandsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const s = await requireRole("TUTOR");
  const { cat } = await searchParams;
  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile) return null;

  const myApps = await db.application.findMany({
    where: { tutorId: profile.id },
    select: { demandId: true, status: true },
  });
  const appMap = new Map(myApps.map((a) => [a.demandId, a.status]));

  const demands = await db.demand.findMany({
    where: {
      status: "OPEN",
      reviewStatus: "APPROVED",
      ...(cat && CATEGORY_LABEL[cat] ? { subject: { category: cat } } : {}),
    },
    include: { subject: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  const visible = demands.filter((d) => !appMap.has(d.id));
  const approved = profile.auditStatus === "APPROVED";

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Hall / 需求大厅</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">公开的求教单</h1>
        {!approved && (
          <p className="text-[13px] text-[#e0a341] mt-3">
            完成认证后才能报名。{profile.auditStatus === "REJECTED" ? "你的材料被驳回，请重新提交。" : "材料审核中。"}{" "}
            <Link href="/tutor/profile" className="link-slide">去处理 →</Link>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/tutor/demands" className={`btn btn-sm ${!cat ? "btn-primary" : ""}`}>全部</Link>
        {CATEGORY_ORDER.map((key) => (
          <Link key={key} href={`/tutor/demands?cat=${key}`} className={`btn btn-sm ${cat === key ? "btn-primary" : ""}`}>
            {CATEGORY_LABEL[key].label}
          </Link>
        ))}
      </div>

      <div className="border-t border-line-strong">
        {visible.length === 0 && (
          <p className="text-[13.5px] text-dim py-14 border-b border-line text-center">
            没有可报名的需求——要么都报过了，要么大厅暂时空着。
          </p>
        )}
        {visible.map((d, i) => (
          <div key={d.id} className="row-item">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="mono text-[11px] text-dim">{d.code}</span>
                  <h3 className="font-serifcn text-[16px] font-semibold">{d.subject.name} · {d.learnerGrade}</h3>
                  <span className="badge">{MODE_LABEL[d.mode]}</span>
                </div>
                {d.description && (
                  <p className="text-[13px] leading-[1.9] text-mute mt-2 max-w-2xl line-clamp-2">{d.description}</p>
                )}
                <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
                  {fmtDate(d.createdAt)} · {d._count.applications} 人已报名
                  {d.region && ` · ${d.region}`}
                  {d.frequency && ` · ${d.frequency}`}
                </p>
              </div>
              {approved && (
                <details className="shrink-0 group">
                  <summary className="btn btn-sm list-none cursor-pointer select-none">报名</summary>
                  <form action={applyToDemandAction} className="card-2 p-4 mt-2 w-72 space-y-3">
                    <input type="hidden" name="demandId" value={d.id} />
                    <textarea
                      name="message"
                      className="textarea !min-h-20 text-[13px]"
                      placeholder="向家长介绍一下你能怎么帮到这位学员…"
                      required
                    />
                    <button className="btn btn-primary btn-sm w-full">提交报名</button>
                  </form>
                </details>
              )}
            </div>
            {i === visible.length - 1 && <div className="h-px" />}
          </div>
        ))}
      </div>
    </div>
  );
}
