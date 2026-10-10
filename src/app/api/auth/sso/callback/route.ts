import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSessionCookie, homeByRole } from "@/lib/auth";
import { consumeSsoState } from "@/lib/ssoState";

export const dynamic = "force-dynamic";

// 相对 Location 重定向：反代场景下应用内部拿到的 req.url 是 127.0.0.1:38081，
// 不能用它拼绝对地址，否则浏览器会被引到 localhost。相对 Location 由浏览器按当前源解析。
const redirectTo = (path: string) =>
  new Response(null, { status: 307, headers: { Location: path } });

// SSO 回调：比对 state → 服务端向 login 服务换身份 → 映射本地用户 → 建立学桥会话
const fail = (code: string) => redirectTo(`/login?error=${code}&t=${Date.now()}`);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticket = url.searchParams.get("ticket") ?? "";
  const state = url.searchParams.get("state") ?? "";

  const jar = await cookies();
  const cookieState = jar.get("sb_sso_state")?.value ?? "";
  jar.delete("sb_sso_state");

  // state 校验：cookie 命中 或 服务端留存命中（任一即可）。
  // 之前只靠客户端 cookie，跨域往返中 cookie 易丢失/过期 → 稳定复现 ?error=4。
  // URL 中的 state 仍是随机不可猜测的令牌，CSRF 防护不受影响。
  const cookieOk = !!cookieState && cookieState === state;
  const serverOk = consumeSsoState(state);
  if (!ticket || !state || (!cookieOk && !serverOk)) return fail("4");

  const issuer = process.env.SSO_ISSUER ?? "";
  const clientId = process.env.SSO_CLIENT_ID ?? "";
  const clientSecret = process.env.SSO_CLIENT_SECRET ?? "";
  if (!issuer || !clientId || !clientSecret) return fail("5");

  let sub = "";
  let username = "";
  let displayName = "";
  try {
    const res = await fetch(`${issuer}/sso/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, client_id: clientId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return fail("4");
    const data = (await res.json()) as { sub?: string; username?: string; displayName?: string };
    sub = String(data.sub ?? "");
    username = String(data.username ?? "");
    displayName = String(data.displayName ?? username);
  } catch {
    return fail("4");
  }
  if (!sub || !username) return fail("4");

  // 运营白名单：SSO_ADMIN_USERNAMES（逗号分隔的明旸账号用户名，不区分大小写）。
  // 命中者自动成为 ADMIN、跳过选身份，直进后台；本地 admin@studybridge.cn 保留为备用通道。
  const adminUsernames = (process.env.SSO_ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminUsernames.includes(username.toLowerCase());

  let user = await db.user.findUnique({ where: { ssoSub: sub } });
  if (!user) {
    // 首次 SSO 登录：建立本地用户（密码哈希为随机占位，不可用于本地登录）
    const email = `${username}@login.mingyanginfo.com`.toLowerCase();
    const clash = await db.user.findUnique({ where: { email } });
    if (clash) return fail("6");
    user = await db.user.create({
      data: {
        ssoSub: sub,
        authSource: "SSO",
        rolePending: !isAdmin,
        role: isAdmin ? "ADMIN" : "PARENT", // 非运营账号为临时占位，/welcome 选择后覆盖
        email,
        name: displayName || username,
        passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
      },
    });
  } else if (isAdmin && (user.role !== "ADMIN" || user.rolePending)) {
    // 白名单账号（含此前以其他角色登录过的）：升级为运营、跳过选身份
    user = await db.user.update({
      where: { id: user.id },
      data: { role: "ADMIN", rolePending: false },
    });
  }

  await setSessionCookie({
    uid: user.id,
    role: user.role as "PARENT" | "TUTOR" | "ADMIN",
    name: user.name,
    rp: user.rolePending,
  });
  return redirectTo(user.rolePending ? "/welcome" : homeByRole(user.role));
}
