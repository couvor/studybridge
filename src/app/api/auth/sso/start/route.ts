import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { cookieSecure } from "@/lib/auth";
import { saveSsoState } from "@/lib/ssoState";

export const dynamic = "force-dynamic";

// SSO 起点：生成 state 存 cookie + 服务端留存，跳转 login 服务 /sso/authorize
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
  const state = randomBytes(16).toString("hex");
  // 服务端留存 state（1 小时），回调时即使客户端 cookie 丢失/过期也能校验通过
  saveSsoState(state);
  const jar = await cookies();
  jar.set("sb_sso_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    maxAge: 3600,
    path: "/",
  });
  const url = new URL("/sso/authorize", issuer);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
