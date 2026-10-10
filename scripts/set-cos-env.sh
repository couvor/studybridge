#!/usr/bin/env bash
# 学桥 · 腾讯云 COS 密钥配置录入（密钥不回显，不进命令行参数/日志）
#
# 用法：bash scripts/set-cos-env.sh
#   提示依次输入 SecretId / SecretKey（不回显）、存储桶名、地域；
#   写入 .env（www:www 600）→ 重启应用 → 自动执行 CORS 配置、桶权限检查、
#   密钥连通性自检与本地旧材料迁移（scripts/cos-setup.mjs）。
#
# 前置（腾讯云控制台）：
#   1. 创建 COS 存储桶（建议地域 ap-shanghai，权限：私有读写）
#   2. 创建子账号（CAM）并仅授予该桶的「数据读写」类权限，生成 API 密钥
set -euo pipefail

ENV_FILE="/www/wwwroot/studybridge/.env"
APP_DIR="/www/wwwroot/studybridge"

[[ $EUID -eq 0 ]] || { echo "✘ 请以 root 运行"; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "✘ 未找到 $ENV_FILE"; exit 1; }

EXIST_SID="$(grep -m1 '^COS_SECRET_ID=' "$ENV_FILE" | cut -d= -f2- || true)"
if [[ -n "$EXIST_SID" ]]; then
  echo "SecretId 已预填：${EXIST_SID:0:6}****（直接回车沿用，或粘贴新值更换）"
fi
read -rsp "SecretId${EXIST_SID:+ [回车沿用预填]}: " SID_IN; echo
SID="${SID_IN:-$EXIST_SID}"
[[ -n "$SID" ]] || { echo "✘ SecretId 缺失，已中止"; exit 1; }
read -rsp "粘贴 SecretKey（输入不回显）: " SKEY; echo
read -rp  "存储桶名（形如 name-125xxxxxxx）: " BUCKET
read -rp  "地域 [默认 ap-shanghai]: " REGION; REGION="${REGION:-ap-shanghai}"
[[ -n "$SKEY" && -n "$BUCKET" ]] || { unset SID SKEY; echo "✘ 信息不完整，已中止"; exit 1; }

# 原子替换 .env（保留其余行；密钥只经内置 printf 与重定向，不进参数）
cd "$APP_DIR"
{
  grep -v '^COS_SECRET_ID=\|^COS_SECRET_KEY=\|^COS_BUCKET=\|^COS_REGION=' .env
  printf 'COS_SECRET_ID=%s\n' "$SID"
  printf 'COS_SECRET_KEY=%s\n' "$SKEY"
  printf 'COS_BUCKET=%s\n' "$BUCKET"
  printf 'COS_REGION=%s\n' "$REGION"
} > .env.new
chown www:www .env.new && chmod 600 .env.new && mv .env.new .env
echo "✔ 已写入 $ENV_FILE（Bucket: $BUCKET / Region: $REGION / SecretId: ${SID:0:6}****）"
unset SID SKEY

systemctl restart studybridge && sleep 1
systemctl is-active studybridge >/dev/null && echo "✔ 应用已重启"

echo "—— 执行 COS 初始化（CORS / 权限检查 / 连通性自检 / 旧材料迁移）——"
runuser -u www -- /usr/local/bin/node "$APP_DIR/scripts/cos-setup.mjs" || {
  echo ""
  echo "⚠️ 初始化有未通过项（见上）。修复后可重跑： runuser -u www -- node $APP_DIR/scripts/cos-setup.mjs"
  exit 1
}
echo "—— 全部完成：非文本数据（认证材料）现在存于 COS ——"
