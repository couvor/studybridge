#!/usr/bin/env bash
# 学桥 · Turnstile 密钥切换脚本（existing-widget flow）
#
# 用法：bash scripts/turnstile-set-secret.sh
#   → 提示粘贴新 Secret Key（不回显）；先向 siteverify 发假 token 验证 secret 有效性，
#     通过后原子写入 .env（TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY），重启并校验。
#
# 密钥纪律：secret 只存在于非导出 shell 变量与 stdin/重定向中，
#           不进入命令行参数（ps 不可见）、不写日志、不回显。
set -euo pipefail

SITEKEY="0x4AAAAAAFSNtlhO5abzeCKN"
ENV_FILE="/www/wwwroot/studybridge/.env"
BASE_URL="https://x.mingyanginfo.com"

[[ $EUID -eq 0 ]] || { echo "✘ 请以 root 运行"; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "✘ 未找到 $ENV_FILE"; exit 1; }

read -rsp "粘贴新 Secret Key（输入不回显）: " SK; echo
[[ -n "${SK:-}" ]] || { echo "✘ 未输入，已中止"; exit 1; }

# 1) 写入前校验 secret：假 token 探测 → 期望 invalid-input-response 且无 invalid-input-secret
RESP=$(printf 'secret=%s&response=XXXX.DUMMY.TOKEN.XXXX' "$SK" \
  | curl -s -m 15 -X POST --data @- https://challenges.cloudflare.com/turnstile/v0/siteverify)
if ! grep -q 'invalid-input-response' <<<"$RESP" || grep -q 'invalid-input-secret' <<<"$RESP"; then
  unset SK
  echo "✘ Secret 有效性校验失败（可能粘贴错误或密钥已轮换），未写入任何文件"
  exit 1
fi
echo "✔ Secret 有效性校验通过"

# 2) 原子替换 .env（保留其余行；新值经重定向写入，不进命令行参数）
cd "$(dirname "$ENV_FILE")"
{
  grep -v '^TURNSTILE_SECRET_KEY=\|^TURNSTILE_SITE_KEY=' "$ENV_FILE"
  printf 'TURNSTILE_SITE_KEY=%s\n' "$SITEKEY"
  printf 'TURNSTILE_SECRET_KEY=%s\n' "$SK"
} > .env.new
chown www:www .env.new && chmod 600 .env.new && mv .env.new "$ENV_FILE"
unset SK
echo "✔ 已写入 $ENV_FILE（属主 www，600）"

# 3) 重启并验证线上已用新 sitekey 渲染
systemctl restart studybridge && sleep 1
systemctl is-active studybridge >/dev/null && echo "✔ 服务运行中"
echo "—— 门禁页当前 sitekey（应为 $SITEKEY）——"
curl -s -m 10 "$BASE_URL/gate" | grep -oE '0x4AAAAAA[A-Za-z0-9_-]+' | head -1 || true
echo "—— 完成。请在浏览器实测：门禁页应出现人机验证组件 ——"
