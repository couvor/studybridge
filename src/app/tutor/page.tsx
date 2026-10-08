import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { AUDIT_STATUS, fmtDate } from "@/lib/constants";
import { Stars } from "@/components/Atoms";

export default async function TutorHome() {
  const s = await requireRole("TUTOR");
  const profile = await db.tutorProfile.findUnique({
    where: { userId: s.uid },
    include: { subjects: true, _count: { select: { applications: true, tutorOrders: true } } },
  });

  const [activeOrders, finishedOrders, pendingApps, notes] = profile
    ? await Promise.all([
        db.order.count({ where: { tutorId: profile.id, status: "ACTIVE" } }),
        db.order.count({ where: { tutorId: profile.id, status: "FINISHED" } }),
        db.application.count({ where: { tutorId: profile.id, status: "PENDING" } }),
        db.notification.findMany({ where: { userId: s.uid }, orderBy: { createdAt: "desc" }, take: 5 }),
      ])
    : [0, 0, 0, []];

  if (!profile) return null;

  const status = AUDIT_STATUS[profile.auditStatus];

  return (
    <div className="space-y-10">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Overview / 总览</p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-3">
          <h1 className="font-serifcn font-black text-3xl">你好，{s.name}</h1>
          <Link href="/tutor/demands" className="btn btn-primary btn-sm">去需求大厅接单</Link>
        </div>
      </div>

      {/* 认证状态卡 */}
      <div className={`card p-7 ${profile.auditStatus === "APPROVED" ? "" : "border-l-2 !border-l-accent"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase">Certification / 认证状态</p>
              <span className={status?.cls}>{status?.label}</span>
            </div>
            <p className="text-[13.5px] leading-[1.9] text-mute mt-3 max-w-xl">
              {profile.auditStatus === "PENDING" && "材料已提交，平台正在人工核验（通常一个工作日内）。认证通过后你的档案才会进入公开教员库。"}
              {profile.auditStatus === "APPROVED" && `你的公开档案已上线：/tutors/${profile.id} ，保持资料新鲜有助于获得更多报名机会。`}
              {profile.auditStatus === "REJECTED" && `核验未通过：${profile.auditNote || "材料不清晰"}。请更换材料后重新提交。`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/tutor/profile" className="btn btn-sm">编辑档案</Link>
            {profile.auditStatus === "APPROVED" && (
              <Link href={`/tutors/${profile.id}`} className="btn btn-sm btn-ghost">查看公开页 →</Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-x border-t border-line divide-x divide-line">
        {[
          { label: "进行中撮合", en: "ACTIVE", num: activeOrders },
          { label: "完成撮合", en: "FINISHED", num: finishedOrders },
          { label: "待家长确认报名", en: "PENDING", num: pendingApps, hot: pendingApps > 0 },
        ].map((st) => (
          <div key={st.en} className="p-6 lg:p-8 border-b border-line">
            <p className={`stat-num !text-[clamp(2rem,3.5vw,3rem)] ${st.hot ? "text-accent-soft" : ""}`}>{st.num}</p>
            <p className="mono text-[9px] tracking-[0.22em] text-dim mt-3">{st.label} / {st.en}</p>
          </div>
        ))}
        <div className="p-6 lg:p-8 border-b border-line">
          <div className="flex items-baseline gap-2">
            <p className="stat-num !text-[clamp(2rem,3.5vw,3rem)]">{profile.ratingAvg.toFixed(1)}</p>
            <Stars value={profile.ratingAvg} size="sm" />
          </div>
          <p className="mono text-[9px] tracking-[0.22em] text-dim mt-3">综合评分 / RATING · {profile.ratingCount} 条</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase">Latest / 最新动态</p>
          <Link href="/notifications" className="mono text-[10px] tracking-[0.15em] text-dim hover:text-accent-soft transition-colors">通知中心 →</Link>
        </div>
        <div className="card divide-y divide-line">
          {notes.length === 0 && <p className="p-6 text-[13px] text-dim">暂无动态</p>}
          {notes.map((n) => (
            <div key={n.id} className="px-5 py-4">
              <p className="text-[13px] leading-[1.8] text-mute">{n.content}</p>
              <p className="mono text-[9px] tracking-[0.15em] text-dim mt-1.5">{fmtDate(n.createdAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
