import type { NextConfig } from "next";

// COS 桶域名从环境变量推导（桶换过名，勿硬编码）：浏览器直传需要放行 connect-src
const cosHost =
  process.env.COS_BUCKET && process.env.COS_REGION
    ? `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com`
    : "";

// 安全响应头（M6）：CSP 放行 Cloudflare Turnstile、明旸登录与 COS 桶直传所需域名；
// script/style 的 'unsafe-inline' 为 Next 运行所必需（水合内联脚本/内联样式）。
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com ${cosHost}`.trim(),
  "frame-src https://challenges.cloudflare.com",
  "form-action 'self' https://login.mingyanginfo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // 不暴露 Next 版本指纹
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
