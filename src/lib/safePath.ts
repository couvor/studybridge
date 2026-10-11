// 站内跳转路径白名单校验（防开放重定向）。
// 仅接受以单个 "/" 开头的纯路径：排除协议相对（//、/\ —— 浏览器会把 \ 规范化为 /）、
// 控制字符与任何含 scheme 的值。返回兜底 "/"。
export function safeInternalPath(raw: string | null | undefined): string {
  const p = String(raw ?? "");
  if (p.length > 0 && p.length <= 512 && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") && !p.includes(":")) {
    return p;
  }
  return "/";
}
