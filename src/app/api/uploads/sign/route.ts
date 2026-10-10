import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cosConfigured, presignPutUrl, uidTag } from "@/lib/cos";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

// 教员认证材料的直传签名：仅登录教员可申请；对象名由服务端生成（客户端不可指定）
// 返回 { configured: false } 时前端回退为随表单提交（服务端中转/本地）。
const KINDS = new Set(["card", "transcript"]);
const EXT_WHITELIST = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "TUTOR") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { kind?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const kind = String(body.kind ?? "");
  const filename = String(body.filename ?? "");
  if (!KINDS.has(kind)) return NextResponse.json({ error: "bad-kind" }, { status: 400 });

  const ext = (filename.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? "").toLowerCase().slice(0, 8);
  if (!EXT_WHITELIST.has(ext)) {
    return NextResponse.json({ error: "bad-ext", hint: "仅支持 JPG / PNG / GIF / WebP / PDF" }, { status: 400 });
  }

  if (!cosConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const name = `${kind}-u${uidTag(session.uid)}-${Date.now()}-${randomBytes(3).toString("hex")}${ext}`;
  try {
    const uploadUrl = await presignPutUrl(name);
    return NextResponse.json({ configured: true, key: name, uploadUrl, expiresIn: 300 });
  } catch (err) {
    console.warn("[cos] presign failed:", (err as Error).message);
    return NextResponse.json({ error: "sign-failed" }, { status: 500 });
  }
}
