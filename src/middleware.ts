import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, verifyGateToken, SESSION_COOKIE, GATE_COOKIE } from "@/lib/jwt";

const ROLE_HOME: Record<string, string> = { PARENT: "/parent", TUTOR: "/tutor", ADMIN: "/admin" };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- 第一道门：站点口令（备案期私有访问）----
  const gatePassword = process.env.GATE_PASSWORD;
  const gateOk = await verifyGateToken(req.cookies.get(GATE_COOKIE)?.value);
  if (gatePassword) {
    if (!gateOk && pathname !== "/gate") {
      const url = new URL("/gate", req.url);
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (gateOk && pathname === "/gate") return NextResponse.redirect(new URL("/", req.url));
  } else if (pathname === "/gate") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ---- 第二道门：角色路由保护 ----
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const seg = pathname.split("/")[1];
  if ((seg === "parent" || seg === "tutor" || seg === "admin") && session?.role !== seg.toUpperCase()) {
    return NextResponse.redirect(new URL(session ? ROLE_HOME[session.role] : "/login", req.url));
  }
  if ((pathname === "/login" || pathname === "/register") && session) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
