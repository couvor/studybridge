// Cloudflare Turnstile 服务端校验（challenges.cloudflare.com siteverify）
//
// 密钥在 /www/wwwroot/studybridge/.env：
//   TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY
// 未配置 secret 时跳过校验（本地开发不受影响）。
// 按下述流程规范（existing-widget flow）强制校验：
//   success === true 且 action 与表单来源一致 且 hostname 在允许列表内。
// 允许主机名可用 TURNSTILE_ALLOWED_HOSTNAMES 覆盖（逗号分隔），默认仅生产域名。

const TEST_SECRET = "1x0000000000000000000000000000000AA";

function allowedHostnames(): string[] {
  const raw = process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? "x.mingyanginfo.com";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyTurnstile(
  token: FormDataEntryValue | null,
  expectedAction: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // 未配置则放行（仅影响本地开发）
  if (!token || typeof token !== "string" || token.length < 10 || token.length > 2048) {
    return false;
  }
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[turnstile] siteverify http ${res.status}`);
      return false;
    }
    const data = (await res.json()) as {
      success: boolean;
      action?: string;
      hostname?: string;
      "error-codes"?: string[];
    };
    // 官方测试密钥下放宽 action/hostname 校验，便于本地联调
    if (secret === TEST_SECRET) return data.success === true;
    if (data.success !== true) {
      console.warn(`[turnstile] verify failed: ${JSON.stringify(data["error-codes"] ?? [])}`);
      return false;
    }
    if (expectedAction && data.action !== expectedAction) {
      console.warn(`[turnstile] action mismatch: got "${data.action}", expected "${expectedAction}"`);
      return false;
    }
    const hosts = allowedHostnames();
    if (hosts.length === 0 || !data.hostname || !hosts.includes(data.hostname.toLowerCase())) {
      console.warn(`[turnstile] hostname rejected: "${data.hostname ?? ""}"`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[turnstile] siteverify error: ${(err as Error).message}`);
    return false;
  }
}
