// 纯 jose JWT 工具（edge / middleware 可用，不依赖 next/headers）
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sb_session";
export const GATE_COOKIE = "sb_gate";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "studybridge-dev-secret-change-me");
}

export type SessionPayload = {
  uid: string;
  role: "PARENT" | "TUTOR" | "ADMIN";
  name: string;
  rp?: boolean; // SSO 首登待选角色（rolePending）
};

export async function signSession(p: SessionPayload) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.uid || !payload.role) return null;
    return {
      uid: String(payload.uid),
      role: payload.role as SessionPayload["role"],
      name: String(payload.name ?? ""),
      rp: payload.rp === true,
    };
  } catch {
    return null;
  }
}

export async function signGate() {
  return new SignJWT({ g: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyGateToken(token?: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.g === 1;
  } catch {
    return false;
  }
}
