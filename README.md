# 学桥 · 大学生家教撮合平台

> 一座连接大学生教员与家庭的桥。**平台仅提供信息撮合**：认证、展示、报名、撮合、课时记录、双向互评。
> 不组织培训、不雇佣教员、不代收课时费。现阶段为免费体验期（订单服务费 ¥0，`feeType`/`feeAmount` 为商业模式预留字段）。

## 技术栈

- Next.js 15（App Router）+ TypeScript + React 19
- Tailwind CSS v4（编辑志设计体系：明暗双主题、衬线大标题、发丝线分区、玻璃导航、滚动动效）
- Prisma + SQLite（schema 按 Postgres 可迁移写法）
- 认证：jose JWT（HttpOnly Cookie）+ bcryptjs，三角色 PARENT / TUTOR / ADMIN

---

## 当前部署状态（2026-10-08）

| 项目 | 值 |
|---|---|
| 部署目录 | `/www/wwwroot/studybridge`（属主 `www:www`） |
| 端口 | `38081`（绑定 `0.0.0.0`） |
| 公网地址 | **http://150.158.55.8:38081**（腾讯云元数据确认） |
| 进程守护 | systemd `studybridge.service`（User=www，Restart=always，开机自启） |
| 访问控制 | 防火墙：38081 **仅放行境外（非中国大陆）IP** + 应用层口令门 `GATE_PASSWORD` |
| IP 段刷新 | systemd 定时器 `studybridge-cnipset.timer`（每周自动更新大陆网段） |
| 密钥位置 | `/www/wwwroot/studybridge/.env`（600，含 `AUTH_SECRET` / `GATE_PASSWORD`） |
| 每日核对 | 清单 `/etc/studybridge/cn-ipv4.txt`（约 5500 条，来源 APNIC） |

### Demo 账号（密码均为 `demo1234`）

| 角色 | 邮箱 | 预置状态 |
|---|---|---|
| 运营 | admin@studybridge.cn | 认证队列有 2 人待审、需求队列有 1 条待审 |
| 家长 | parent@demo.cn | D-0001（考研数学）有 2 份待确认报名；O-0002 已完结待评价 |
| 教员 | tutor@demo.cn（沈亦舟） | 已认证，报名记录待家长确认 |
| 待审核教员 | tutornew1@demo.cn（秦朗） | 材料待审核，可体验后台审核闭环 |

---

## 常用运维命令

```bash
# 服务
systemctl status studybridge          # 状态
systemctl restart studybridge         # 重启（改代码/配置后）
journalctl -u studybridge -f          # 实时日志

# 改配置（口令、密钥等）后重启生效
vim /www/wwwroot/studybridge/.env
systemctl restart studybridge

# 更新代码后的重建
cd /www/wwwroot/studybridge
su -s /bin/bash www -c "npm run build"
systemctl restart studybridge

# 访问控制
scripts/allow-overseas-only.sh status          # 查看当前规则
scripts/allow-overseas-only.sh refresh         # 手动刷新大陆 IP 段
scripts/allow-overseas-only.sh apply 38082     # 对新增端口套用同样策略
scripts/allow-overseas-only.sh remove 38081    # 撤销（备案通过后改用域名正式上线时）

# 防火墙备份（改动前的存档）
ls /root/firewalld-backup-*.tar.gz
```

### 访问控制说明（重要）

1. **只放行境外 IP 的实现**：firewalld `ipset cn_ipv4`（约 5500 条大陆网段）+ `priority=-10` 的 rich rule，
   落在 `zone_pre` 链 —— 先 drop 大陆来源，再放行端口。规则只作用于 38081，
   **SSH(22)、nginx(80/443)、宝塔(18888)、MySQL 等完全不受影响**（你的 SSH 管理来自境内 IP，不受任何影响）。
2. **放行的是全部境外 IP，不是只有你的 IP**。因此应用层口令门必须保持开启：
   `.env` 里的 `GATE_PASSWORD` 一旦清空，任何境外 IP 都能直接看到站点。
3. **腾讯云安全组**需放行 `38081/TCP`（入站 `0.0.0.0/0`）；境内 IP 由主机防火墙静默丢弃。
4. **备案通过后**：域名解析到本机 → 执行 `scripts/allow-overseas-only.sh remove 38081` 解除地域限制 →
   按需给 Nginx 配 443/TLS 反代（届时把 `-p 38081` 换成反代即可），并把 `.env` 里的
   `COOKIE_SECURE` 改为 `1`、重启服务。
5. **账号统一（已决策，备案后执行）**：学桥届时接入 `login.mingyanginfo.com` 作为唯一登录入口，
   用户只注册一次、只绑一次 2FA。完整方案（协议、两端改动、执行顺序、回滚）见
   [`docs/sso-unification-plan.md`](docs/sso-unification-plan.md)。

### 从境外验证访问（你自己测）

```bash
# 境外机器上执行，应返回 307 → /gate
curl -I http://150.158.55.8:38081/
# 境内机器上执行，应超时/无响应（这是设计行为）
```

---

## 本地开发

```bash
cd /www/wwwroot/studybridge
npm install
npm run setup        # 建库 + 灌入示例数据（会清空重灌）
npm run dev          # http://127.0.0.1:3000（开发模式）
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `AUTH_SECRET` | 会话签名密钥（已生成） |
| `GATE_PASSWORD` | **站点口令门**，留空则关闭口令门（备案期务必保持设置） |
| `HOST` / `PORT` | 生产 `0.0.0.0` / `38081` |
| `COOKIE_SECURE` | Cookie 的 Secure 标记。**明文 HTTP 访问期间必须为 `0`**；接入域名 + HTTPS 后改为 `1` |

> ⚠️ 踩坑记录：浏览器会**丢弃明文连接上的 Secure Cookie**，而 Cookie 是登录态与口令门的载体。
> 所以 `COOKIE_SECURE=1` 配在 `http://IP:端口` 上时，症状是「口令/登录提交成功，但下一页又被弹回」。
> 上线 HTTPS 后改成 `1`（防 Cookie 明文传输），中间不要漏改。

---

## 业务流程

```
教员注册 → 提交学生证/成绩单 → 平台人工审核 → 进入公开教员库
家长发布需求 → 平台审核 → 需求大厅（教员报名 / 平台人工推荐）
家长接受报名 → 生成撮合单（免费）→ 双方自行商定排课与课时费直接结算
每次课后家长记课时反馈 → 任一方结束撮合 → 双向互评 → 评分沉淀教员档案
```

认证材料存于 `uploads/`（不入 git、不在 public），仅管理员与教员本人可经 `/api/uploads/[name]` 鉴权查看。

## 未来收费切换点

`Order.feeType`（`NONE` / `AGENCY_ONE_TIME`）与 `feeAmount` 已预留。切换「一次性中介费」模式时：
家长接受报名处插入付费确认，成单回调中将 `feeType` 置为 `AGENCY_ONE_TIME` 并写入金额即可，数据模型无需变更。

## 目录速览

```
src/
  app/
    (site)/          # 公开页：首页 / 教员库 / 教员档案 / 登录注册 / 通知
    gate/            # 备案期站点口令门
    parent/          # 家长端：需求管理 / 报名决策 / 撮合单 / 课时反馈 / 互评
    tutor/           # 教员端：档案认证 / 需求大厅 / 我的报名 / 撮合单
    admin/           # 运营后台：认证审核 / 需求审核 / 人工撮合 / 订单 / 用户
    actions/         # 全部 Server Actions
    api/uploads/     # 认证材料鉴访问
  components/        # Navbar / Footer / SectionNav / 设计原子组件
  lib/               # db / auth / jwt / constants / notify
  middleware.ts      # 口令门 + 角色路由保护
prisma/              # schema + seed
scripts/             # allow-overseas-only.sh（访问控制）
deploy/              # systemd 单元（studybridge / cnipset 定时刷新）
```

## 合规提醒

- 平台定位为信息撮合，不组织学科类培训、不代收费用；页面已含免责声明。
- 备案通过前，域名不要解析到大陆服务器；用 IP + 口令门做私有体验。
- 备案通过后再开放域名访问，并按当地要求完成经营性/非经营性备案的后续手续。
