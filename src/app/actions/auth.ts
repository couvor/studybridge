"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSessionCookie, clearSessionCookie, homeByRole, cookieSecure } from "@/lib/auth";
import { signGate, GATE_COOKIE } from "@/lib/jwt";

export async function gateAction(fd: FormData) {
  const pwd = String(fd.get("password") ?? "");
  const nextRaw = String(fd.get("next") ?? "/");
  const safeNext = nextRaw.startsWith("/") ? nextRaw : "/";
  const qs =
    (safeNext !== "/" ? `next=${encodeURIComponent(safeNext)}&` : "") + `t=${Date.now()}`;
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
  const user = await db.user.findUnique({ where: { email } });
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
  await clearSessionCookie();
  redirect("/");
}
