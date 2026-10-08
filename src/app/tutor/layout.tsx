import Navbar from "@/components/Navbar";
import SectionNav from "@/components/SectionNav";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TUTOR");
  const [unread, profile] = await Promise.all([
    db.notification.count({ where: { userId: session.uid, read: false } }),
    db.tutorProfile.findUnique({ where: { userId: session.uid } }),
  ]);
  const notCertified = profile && profile.auditStatus !== "APPROVED";

  return (
    <>
      <Navbar session={{ name: session.name, role: session.role }} unread={unread} />
      <div className="pt-24 flex-1 w-full">
        <div className="container-x py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <aside className="lg:col-span-2">
            <p className="mono text-[9px] tracking-[0.3em] text-dim uppercase mb-4 px-3.5">Tutor / 教员中心</p>
            <SectionNav
              items={[
                { href: "/tutor", label: "总览" },
                { href: "/tutor/profile", label: notCertified ? "档案与认证 ●" : "档案与认证" },
                { href: "/tutor/demands", label: "需求大厅" },
                { href: "/tutor/applications", label: "我的报名" },
                { href: "/tutor/orders", label: "撮合单" },
              ]}
            />
          </aside>
          <main className="lg:col-span-10 min-w-0">{children}</main>
        </div>
      </div>
    </>
  );
}
