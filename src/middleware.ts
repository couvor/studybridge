import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, verifyGateToken, SESSION_COOKIE, GATE_COOKIE } from "@/lib/jwt";

const ROLE_HOME: Record<string, string> = { PARENT: "/parent", TUTOR: "/tutor", ADMIN: "/admin" };

// 反代部署下，Next 内部重构的 req.url 是 localhost:端口（不信任 Host 头），
// 不能用于拼重定向地址；这里用显式的站点源（env 优先，头回退）来构造绝对 Location。
function publicOrigin(req: NextRequest): string {
  const envOrigin = process.env.SITE_ORIGIN;
  if (envOrigin) return envOrigin.replace(/\/+$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}
const redirectTo = (req: NextRequest, path: string) =>
  NextResponse.redirect(new URL(path, publicOrigin(req)));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- 第一道门：站点口令（内测期私有访问）----
  // SSO 握手端点豁免：回调带一次性 ticket，若被门禁重定向会丢参数、登录链路断裂；
  // 站点内容仍全部受门禁保护（回调建立会话后访问页面照样要过门禁）。
  const gateExempt = pathname.startsWith("/api/auth/sso/");
  const gatePassword = process.env.GATE_PASSWORD;
  const gateOk = await verifyGateToken(req.cookies.get(GATE_COOKIE)?.value);
  if (gatePassword) {
    if (!gateOk && pathname !== "/gate" && !gateExempt) {
      // 保留完整路径与查询串，过门禁后回到原目标
      const target = pathname + (req.nextUrl.search || "");
      const q = target && target !== "/" ? `?next=${encodeURIComponent(target)}` : "";
      return redirectTo(req, `/gate${q}`);
    }
    if (gateOk && pathname === "/gate") return redirectTo(req, "/");
  } else if (pathname === "/gate") {
    return redirectTo(req, "/");
  }

  // ---- 第二道门：角色路由保护 ----
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const seg = pathname.split("/")[1];
  // SSO 首登待选角色：进入任何角色区之前先去 /welcome
  if (session?.rp && (seg === "parent" || seg === "tutor" || seg === "admin")) {
    return redirectTo(req, "/welcome");
  }
  if ((seg === "parent" || seg === "tutor" || seg === "admin") && session?.role !== seg.toUpperCase()) {
    return redirectTo(req, session ? ROLE_HOME[session.role] : "/login");
  }
  // 强制改密：必须改密的用户只放行改密页与登出，其余一律拦截
  if (session?.mcp && pathname !== "/account/change-password" && pathname !== "/logout") {
    return redirectTo(req, "/account/change-password");
  }
  if ((pathname === "/login" || pathname === "/register") && session) {
    return redirectTo(req, session.rp ? "/welcome" : (ROLE_HOME[session.role] ?? "/"));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
