import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const unread = session
    ? await db.notification.count({ where: { userId: session.uid, read: false } })
    : 0;
  return (
    <>
      <Navbar session={session ? { name: session.name, role: session.role } : null} unread={unread} />
      <div className="pt-24 flex-1 flex flex-col">{children}</div>
      <Footer />
    </>
  );
}
