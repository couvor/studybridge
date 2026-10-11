// 认证材料的类型白名单：中转上传（actions/tutor）、直传签名（/api/uploads/sign）、
// 查看转发（/api/uploads/[name]）三处共用，保证全链路一致。

export const MATERIAL_EXT_WHITELIST = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"]);

export const MATERIAL_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

// 从文件名取扩展名（小写、限长），不在白名单内返回 null
export function materialExt(filename: string): string | null {
  const ext = (filename.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? "").toLowerCase().slice(0, 8);
  return MATERIAL_EXT_WHITELIST.has(ext) ? ext : null;
}

// 直传签名用的 Content-Type：由服务端从扩展名推导，客户端必须原样回传
export function materialContentType(ext: string): string {
  return MATERIAL_MIME[ext] ?? "application/octet-stream";
}
