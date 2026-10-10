import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cosConfigured, getObjectBuffer } from "@/lib/cos";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

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
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
