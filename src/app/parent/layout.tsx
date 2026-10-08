import Navbar from "@/components/Navbar";
import SectionNav from "@/components/SectionNav";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PARENT");
  const [unread, pendingApps] = await Promise.all([
    db.notification.count({ where: { userId: session.uid, read: false } }),
    db.application.count({
      where: { demand: { parentId: session.uid }, status: "PENDING" },
    }),
  ]);

  return (
    <>
      <Navbar session={{ name: session.name, role: session.role }} unread={unread} />
      <div className="pt-24 flex-1 w-full">
        <div className="container-x py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <aside className="lg:col-span-2">
            <p className="mono text-[9px] tracking-[0.3em] text-dim uppercase mb-4 px-3.5">Parent / 家长中心</p>
            <SectionNav
              items={[
                { href: "/parent", label: "总览" },
                { href: "/parent/demands", label: "我的需求", badge: pendingApps || undefined },
                { href: "/parent/orders", label: "撮合单" },
              ]}
            />
          </aside>
          <main className="lg:col-span-10 min-w-0">{children}</main>
        </div>
      </div>
    </>
  );
}
