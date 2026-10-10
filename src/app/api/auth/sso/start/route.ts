import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { cookieSecure } from "@/lib/auth";

export const dynamic = "force-dynamic";

// SSO 起点：生成 state 存 cookie，跳转 login 服务 /sso/authorize
export async function GET(req: Request) {
  const issuer = process.env.SSO_ISSUER;
  const clientId = process.env.SSO_CLIENT_ID;
  const redirectUri = process.env.SSO_REDIRECT_URI;
  if (!issuer || !clientId || !redirectUri) {
    // 相对 Location（反代下 req.url 不可用于拼绝对地址）
    return new Response(null, { status: 307, headers: { Location: "/login?error=5" } });
  }
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("sb_sso_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    maxAge: 600,
    path: "/",
  });
  const url = new URL("/sso/authorize", issuer);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
