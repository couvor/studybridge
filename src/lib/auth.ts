import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, verifySessionToken, SESSION_COOKIE, type SessionPayload } from "./jwt";

export type Session = SessionPayload;

// 明文 HTTP 访问期间必须为 0：浏览器会丢弃明文连接上的 Secure Cookie，
// 表现为「提交成功但下一页又弹回登录/口令页」。接入域名 + HTTPS 后设为 1。
export function cookieSecure() {
  return process.env.COOKIE_SECURE === "1";
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(p: SessionPayload) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(p), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export function homeByRole(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "TUTOR") return "/tutor";
  return "/parent";
}

export async function requireRole(role: Session["role"]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== role) redirect(homeByRole(s.role));
  return s;
}
