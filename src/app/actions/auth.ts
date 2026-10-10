"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSessionCookie, clearSessionCookie, homeByRole, cookieSecure, getSession } from "@/lib/auth";
import { signGate, GATE_COOKIE, SESSION_COOKIE } from "@/lib/jwt";
import { verifyTurnstile } from "@/lib/turnstile";

export async function gateAction(fd: FormData) {
  const pwd = String(fd.get("password") ?? "");
  const nextRaw = String(fd.get("next") ?? "/");
  // 仅接受站内路径；排除 // 开头的协议相对地址（防开放重定向）
  const safeNext = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const qs =
    (safeNext !== "/" ? `next=${encodeURIComponent(safeNext)}&` : "") + `t=${Date.now()}`;
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response"), "sb-gate"))) {
    redirect(`/gate?error=2&${qs}`);
  }
  if (!process.env.GATE_PASSWORD || pwd !== process.env.GATE_PASSWORD) {
    redirect(`/gate?error=1&${qs}`);
  }
  const jar = await cookies();
  jar.set(GATE_COOKIE, await signGate(), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect(safeNext);
}

export async function loginAction(fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response"), "sb-login"))) {
    redirect(`/login?error=2&t=${Date.now()}`);
  }
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.authSource === "SSO") {
    // SSO 账号必须走明旸账号登录，本地密码不可用
    redirect(`/login?error=3&t=${Date.now()}`);
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect(`/login?error=1&t=${Date.now()}`);
  }
  await setSessionCookie({ uid: user.id, role: user.role as "PARENT" | "TUTOR" | "ADMIN", name: user.name });
  redirect(homeByRole(user.role));
}

export async function registerAction(fd: FormData) {
  const role = String(fd.get("role") ?? "PARENT") === "TUTOR" ? "TUTOR" : "PARENT";
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const phone = String(fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const back = (code: string) =>
    redirect(`/register?role=${role}&error=${code}&t=${Date.now()}`);

  if (!(await verifyTurnstile(fd.get("cf-turnstile-response"), "sb-register"))) {
    return back("captcha");
  }
  if (!name || !email || !password) return back("empty");
  if (password.length < 6) return back("short");
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return back("exists");

  const user = await db.user.create({
    data: {
      role,
      email,
      name,
      phone,
      passwordHash: await bcrypt.hash(password, 10),
      ...(role === "TUTOR" ? { tutorProfile: { create: {} } } : {}),
    },
  });
  await setSessionCookie({ uid: user.id, role: user.role as "TUTOR", name: user.name });
  redirect(role === "TUTOR" ? "/tutor/profile" : "/parent");
}

export async function logoutAction() {
  const jar = await cookies();
  // 退出要清干净：会话、站点门禁、SSO 握手态，否则下次访问仍免门禁/免密
  jar.delete(SESSION_COOKIE);
  jar.delete(GATE_COOKIE);
  jar.delete("sb_sso_state");
  redirect("/");
}

// SSO 首登选角色（家长 / 教员）：仅待选状态可用，选择后写入会话
export async function chooseRoleAction(fd: FormData) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.rp) redirect(homeByRole(s.role));
  const role = String(fd.get("role") ?? "PARENT") === "TUTOR" ? "TUTOR" : "PARENT";
  const existingProfile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  await db.user.update({
    where: { id: s.uid },
    data: {
      role,
      rolePending: false,
      ...(role === "TUTOR" && !existingProfile ? { tutorProfile: { create: {} } } : {}),
    },
  });
  await setSessionCookie({ uid: s.uid, role, name: s.name });
  redirect(homeByRole(role));
}
