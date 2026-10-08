#!/usr/bin/env bash
# 学桥 · 备案期访问控制：让指定端口「只放行境外 IP」
#
#   ./allow-overseas-only.sh apply 38081 [更多端口...]   # 应用规则（幂等，默认 38081）
#   ./allow-overseas-only.sh refresh                     # 更新大陆 IP 段（配定时器每周执行）
#   ./allow-overseas-only.sh status                      # 查看状态
#   ./allow-overseas-only.sh remove 38081 [更多端口...]  # 撤销规则
#
# 原理（firewalld 1.x）：
#   1. ipset cn_ipv4 载入中国大陆 IPv4 网段（APNIC 权威数据，自动多源回退）
#   2. 目标端口加一条 priority=-10 的 rich rule：来源命中 cn_ipv4 → drop
#      负优先级位于 zone_pre 链，先于端口放行规则执行，因此「先拒绝、后放行」顺序正确
#   3. 仅作用于指定端口 —— SSH(22)、nginx(80/443)、宝塔(18888) 等一律不受影响
#
# 安全提示：本规则放行的是「全部境外 IP」，并非只有你的 IP。
#          因此应用层口令门（GATE_PASSWORD）必须保持开启。
set -euo pipefail

SET=cn_ipv4
ZONE=public
DEFAULT_PORTS="38081"
LIST_DIR=/etc/studybridge
LIST_FILE="$LIST_DIR/cn-ipv4.txt"

log()  { printf '\033[36m▸\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✔\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✘\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "请以 root 运行"

# ---------- 下载大陆 IPv4 网段 ----------
fetch_cn_list() {
  mkdir -p "$LIST_DIR"
  local tmp; tmp=$(mktemp)

  log "拉取中国大陆 IPv4 网段…"
  if curl -fsSL -m 30 https://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest -o "$tmp" 2>/dev/null; then
    awk -F'|' '$2=="CN" && $3=="ipv4" && ($7=="allocated"||$7=="assigned") {
      n=$5; p=32-int(log(n)/log(2)); print $4"/"p
    }' "$tmp" | sort -u > "$LIST_FILE"
  fi
  if [[ ! -s "$LIST_FILE" ]] && curl -fsSL -m 30 https://www.ipdeny.com/ipblocks/data/aggregated/cn-aggregated.zone -o "$tmp" 2>/dev/null; then
    sort -u "$tmp" > "$LIST_FILE"
  fi
  if [[ ! -s "$LIST_FILE" ]] && curl -fsSL -m 30 https://raw.githubusercontent.com/17mon/china_ip_list/master/china_ip_list.txt -o "$tmp" 2>/dev/null; then
    sort -u "$tmp" > "$LIST_FILE"
  fi
  rm -f "$tmp"

  local n; n=$(wc -l < "$LIST_FILE" 2>/dev/null || echo 0)
  [[ "$n" -gt 1000 ]] || die "网段列表异常（仅 $n 条），已中止以免误放行"
  grep -q '^1\.0\.1\.0/24' "$LIST_FILE" || warn "列表里未见预期条目 1.0.1.0/24，请留意数据源变化"
  ok "已获取 $n 条大陆网段 → $LIST_FILE"
}

# ---------- ipset 管理 ----------
ipset_exists() { firewall-cmd --permanent --get-ipsets 2>/dev/null | grep -qx "$SET"; }

create_ipset() {
  ipset_exists && return 0
  firewall-cmd --permanent --new-ipset="$SET" --type=hash:net \
    --option=family=inet --option=maxelem=262144 >/dev/null
  ok "已创建 ipset $SET"
}

load_ipset_entries() {
  firewall-cmd --permanent --ipset="$SET" --add-entries-from-file="$LIST_FILE" >/dev/null
  ok "已载入网段条目"
}

rich_rule_for() {
  echo "rule family=\"ipv4\" priority=\"-10\" source ipset=\"$SET\" port port=\"$1\" protocol=\"tcp\" drop"
}

# ---------- apply ----------
apply() {
  local ports=("${@:-$DEFAULT_PORTS}")
  [[ -s "$LIST_FILE" ]] || fetch_cn_list
  create_ipset
  load_ipset_entries

  for p in "${ports[@]}"; do
    local rule; rule=$(rich_rule_for "$p")
    if ! firewall-cmd --permanent --zone="$ZONE" --query-rich-rule="$rule" >/dev/null 2>&1; then
      firewall-cmd --permanent --zone="$ZONE" --add-rich-rule="$rule" >/dev/null
      ok "已添加拒绝规则：大陆 IP → 端口 $p"
    else
      log "拒绝规则已存在：端口 $p"
    fi
    firewall-cmd --permanent --query-port="$p/tcp" >/dev/null 2>&1 \
      || firewall-cmd --permanent --add-port="$p/tcp" >/dev/null
    ok "端口 $p 已放行（由上面的规则限定为仅境外来源）"
  done

  firewall-cmd --reload >/dev/null
  ok "firewalld 已重载"
  warn "提醒：放行的是全部境外 IP，站点口令门 GATE_PASSWORD 务必保持开启"
  verify "${ports[@]}"
}

# ---------- refresh ----------
refresh() {
  log "刷新大陆 IP 段（先摘除规则，避免引用悬空）…"
  local rules_records=()
  while IFS= read -r line; do rules_records+=("$line"); done < <(
    firewall-cmd --permanent --zone="$ZONE" --list-rich-rules 2>/dev/null | grep "ipset=\"$SET\"" || true
  )
  for r in "${rules_records[@]:-}"; do
    [[ -n "$r" ]] && firewall-cmd --permanent --zone="$ZONE" --remove-rich-rule="$r" >/dev/null
  done
  [[ ${#rules_records[@]} -gt 0 ]] && ok "已暂存 ${#rules_records[@]} 条规则"
  ipset_exists && firewall-cmd --permanent --delete-ipset="$SET" >/dev/null && ok "旧 ipset 已删除"

  fetch_cn_list
  create_ipset
  load_ipset_entries
  for r in "${rules_records[@]:-}"; do
    [[ -n "$r" ]] && firewall-cmd --permanent --zone="$ZONE" --add-rich-rule="$r" >/dev/null
  done
  [[ ${#rules_records[@]} -gt 0 ]] && ok "规则已恢复"

  firewall-cmd --reload >/dev/null
  ok "刷新完成"
  mapfile -t ports < <(printf '%s\n' "${rules_records[@]:-}" | sed -n 's/.*port port="\([0-9]*\)".*/\1/p')
  verify "${ports[@]:-}"
}

# ---------- remove ----------
remove() {
  local ports=("$@")
  if [[ ${#ports[@]} -eq 0 ]]; then
    mapfile -t ports < <(firewall-cmd --permanent --zone="$ZONE" --list-rich-rules 2>/dev/null \
      | grep "ipset=\"$SET\"" | sed -n 's/.*port port="\([0-9]*\)".*/\1/p')
  fi
  for p in "${ports[@]:-}"; do
    [[ -z "$p" ]] && continue
    firewall-cmd --permanent --zone="$ZONE" --remove-rich-rule="$(rich_rule_for "$p")" >/dev/null 2>&1 || true
    firewall-cmd --permanent --remove-port="$p/tcp" >/dev/null 2>&1 || true
    ok "已撤销端口 $p 的规则并关闭端口"
  done
  # 清理 ipset（若已无规则引用）
  if ipset_exists && ! firewall-cmd --permanent --zone="$ZONE" --list-rich-rules 2>/dev/null | grep -q "ipset=\"$SET\""; then
    firewall-cmd --permanent --delete-ipset="$SET" >/dev/null && ok "已删除 ipset $SET"
  fi
  firewall-cmd --reload >/dev/null
  ok "已重载 firewalld"
}

# ---------- verify / status ----------
verify() {
  local ports=("${@:-$DEFAULT_PORTS}")
  log "校验规则是否已下发至内核…"

  # reload 后内核应用可能有秒级延迟，重试等待
  local tries=0
  until nft list ruleset 2>/dev/null | grep -q "saddr @$SET"; do
    tries=$((tries + 1))
    if [[ $tries -ge 10 ]]; then
      die "等待 10s 仍未在内核规则中找到 $SET 匹配，请手动检查：nft list ruleset | grep $SET"
    fi
    sleep 1
  done
  ok "内核规则已生效"

  # 顺序校验：drop 必须出现在端口 accept 之前
  local ruleset; ruleset=$(nft list ruleset 2>/dev/null)
  for p in "${ports[@]}"; do
    local drop_line accept_line
    drop_line=$(grep -n "saddr @$SET .*dport $p .*drop" <<<"$ruleset" | head -1 | cut -d: -f1)
    accept_line=$(grep -n "dport $p .*accept" <<<"$ruleset" | grep -v "saddr @" | head -1 | cut -d: -f1)
    if [[ -n "$drop_line" && -n "$accept_line" ]] && (( drop_line < accept_line )); then
      ok "端口 $p：拒绝规则（第 $drop_line 行）先于放行规则（第 $accept_line 行）✔"
    elif [[ -n "$drop_line" ]]; then
      warn "端口 $p：找到拒绝规则（第 $drop_line 行）但未见独立放行规则，请确认端口已放行"
    else
      die "端口 $p：未找到拒绝规则，访问控制未生效！"
    fi
  done
}

status() {
  echo "── ipset ──"
  firewall-cmd --info-ipset="$SET" 2>/dev/null || echo "（未创建）"
  echo "── rich rules ──"
  firewall-cmd --permanent --zone="$ZONE" --list-rich-rules 2>/dev/null | grep "ipset=\"$SET\"" || echo "（无）"
  echo "── 端口 ──"
  firewall-cmd --zone="$ZONE" --list-ports
  echo "── 其他端口（应保持不变）──"
  firewall-cmd --zone="$ZONE" --list-services
}

case "${1:-}" in
  apply)   shift; apply "$@" ;;
  refresh) refresh ;;
  remove)  shift; remove "$@" ;;
  status)  status ;;
  *) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
