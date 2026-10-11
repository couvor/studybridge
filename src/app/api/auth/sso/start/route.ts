import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { cookieSecure } from "@/lib/auth";
import { saveSsoState } from "@/lib/ssoState";
import { clientIpFromReq, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// SSO 起点：生成 state + 匿名标识（双 cookie）并服务端留存，跳转 login 服务 /sso/authorize
export async function GET(req: Request) {
  const issuer = process.env.SSO_ISSUER;
  const clientId = process.env.SSO_CLIENT_ID;
  const redirectUri = process.env.SSO_REDIRECT_URI;
  // 跳转不落缓存：URL 带 state 令牌，且该响应本身是登录链路一环
  const noStore = { "Cache-Control": "no-store" } as const;
  if (!issuer || !clientId || !redirectUri) {
    // 相对 Location（反代下 req.url 不可用于拼绝对地址）
    return new Response(null, { status: 307, headers: { Location: "/login?error=5", ...noStore } });
  }
  // 防止匿名 cookie 被清后反复刷新灌满服务端 state 表
  if (!rateLimit(`sso-start:${clientIpFromReq(req)}`, 30, 10 * 60_000)) {
    return new Response(null, { status: 429, headers: { Location: "/login?error=7", ...noStore } });
  }
  const state = randomBytes(16).toString("hex");
  const anon = randomBytes(16).toString("hex");
  // 服务端留存 state（1 小时，绑定匿名标识），回调时即使 sb_sso_state 丢失，
  // 只要 sb_sso_anon 还在即可校验通过；他人预植的 state 因匿名标识不匹配而失效
  saveSsoState(state, anon);
  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    maxAge: 3600,
    path: "/",
  };
  jar.set("sb_sso_state", state, cookieOpts);
  jar.set("sb_sso_anon", anon, cookieOpts);
  const url = new URL("/sso/authorize", issuer);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
