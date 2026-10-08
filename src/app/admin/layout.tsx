import Navbar from "@/components/Navbar";
import SectionNav from "@/components/SectionNav";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  const [unread, pendingAudits, pendingDemands] = await Promise.all([
    db.notification.count({ where: { userId: session.uid, read: false } }),
    db.tutorProfile.count({ where: { auditStatus: "PENDING" } }),
    db.demand.count({ where: { reviewStatus: "PENDING" } }),
  ]);

  return (
    <>
      <Navbar session={{ name: session.name, role: session.role }} unread={unread} />
      <div className="pt-24 flex-1 w-full">
        <div className="container-x py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <aside className="lg:col-span-2">
            <p className="mono text-[9px] tracking-[0.3em] text-dim uppercase mb-4 px-3.5">Admin / 运营后台</p>
            <SectionNav
              items={[
                { href: "/admin", label: "看板" },
                { href: "/admin/audits", label: "认证审核", badge: pendingAudits || undefined },
                { href: "/admin/demands", label: "需求审核", badge: pendingDemands || undefined },
                { href: "/admin/recommends", label: "人工撮合" },
                { href: "/admin/orders", label: "订单总览" },
                { href: "/admin/users", label: "用户管理" },
              ]}
            />
          </aside>
          <main className="lg:col-span-10 min-w-0">{children}</main>
        </div>
      </div>
    </>
  );
}
