import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cosConfigured, getObjectBuffer } from "@/lib/cos";
import { MATERIAL_MIME } from "@/lib/materials";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// 认证材料的鉴访问：仅管理员与材料本人
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await params;
  if (!/^[\w.-]+$/.test(name) || name.includes("..")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  if (session.role === "TUTOR") {
    const profile = await db.tutorProfile.findUnique({ where: { userId: session.uid } });
    if (!profile || (profile.studentCardUrl !== name && profile.transcriptUrl !== name)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  } else if (session.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const file = path.join(UPLOAD_DIR, name);
  let buf: Buffer | null = null;
  if (cosConfigured()) {
    try {
      buf = await getObjectBuffer(name);
    } catch {
      buf = null; // 落 COS 失败时回退本地（历史文件）
    }
  }
  if (!buf) {
    try {
      await stat(file);
      buf = await readFile(file);
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }
  const ext = path.extname(name).toLowerCase();
  const mime = MATERIAL_MIME[ext];
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      // 类型只来自扩展名白名单；白名单外一律 octet-stream + 强制下载，
      // 配合 nosniff 防止浏览器把上传内容嗅探成 HTML/脚本（存储型 XSS / webshell）
      "Content-Type": mime ?? "application/octet-stream",
      ...(mime ? {} : { "Content-Disposition": "attachment" }),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
