import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { markAllReadAction } from "@/app/actions/notifications";
import { fmtDateTime } from "@/lib/constants";

export const metadata = { title: "通知中心 · 学桥" };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await db.notification.findMany({
    where: { userId: session.uid },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="container-x flex-1 py-14 lg:py-20">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase mb-3">Notifications / 通知中心</p>
          <h1 className="font-serifcn font-black text-3xl">站内通知</h1>
        </div>
        {items.some((n) => !n.read) && (
          <form action={markAllReadAction}>
            <button className="btn btn-sm">全部标为已读</button>
          </form>
        )}
      </div>

      <div className="border-t border-line">
        {items.length === 0 && (
          <p className="text-[13.5px] text-dim py-14 text-center">还没有通知。撮合开始后，动态会出现在这里。</p>
        )}
        {items.map((n) => (
          <div key={n.id} className="row-item flex items-start gap-4">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${n.read ? "bg-line-strong" : "bg-accent-soft shadow-[0_0_8px_var(--accent-soft)]"}`} />
            <div className="flex-1 min-w-0">
              {n.link ? (
                <a href={n.link} className="text-[14px] leading-[1.8] hover:text-accent-soft transition-colors">{n.content}</a>
              ) : (
                <p className="text-[14px] leading-[1.8]">{n.content}</p>
              )}
              <p className="mono text-[10px] tracking-[0.15em] text-dim mt-1">{fmtDateTime(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
