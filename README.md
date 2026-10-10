# 学桥 · 大学生家教撮合平台

> 一座连接大学生教员与家庭的桥。**平台仅提供信息撮合**：认证、展示、报名、撮合、课时记录、双向互评。
> 不组织培训、不雇佣教员、不代收课时费。现阶段为免费体验期（订单服务费 ¥0，`feeType`/`feeAmount` 为商业模式预留字段）。

## 技术栈

- Next.js 15（App Router）+ TypeScript + React 19
- Tailwind CSS v4（编辑志设计体系：明暗双主题、衬线大标题、发丝线分区、玻璃导航、滚动动效）
- Prisma + SQLite（schema 按 Postgres 可迁移写法）
- 认证：jose JWT（HttpOnly Cookie）+ bcryptjs，三角色 PARENT / TUTOR / ADMIN

---

## 当前部署状态（2026-10-09）

| 项目 | 值 |
|---|---|
| 部署目录 | `/www/wwwroot/studybridge`（属主 `www:www`） |
| 端口 | `38081`（**仅绑定 `127.0.0.1`**，端口直连已全关；只经 nginx 443 反代对外） |
| 公网地址 | **https://x.mingyanginfo.com**（Cloudflare 灰云 → nginx 443 → `127.0.0.1:38081`） |
| 证书 | Let's Encrypt（acme.sh webroot 签发，至 2027-01-07，cron 自动续期 + reload nginx） |
| ICP 备案 | **陕ICP备2026028201号**（页脚与门禁页已挂，链接工信部） |
| 进程守护 | systemd `studybridge.service`（User=www，Restart=always，开机自启） |
| 访问控制 | 域名入口（HTTPS）+ **Cloudflare Turnstile 人机验证**（门禁/登录/注册三处）+ 应用层口令门 `GATE_PASSWORD` |
| 密钥位置 | `/www/wwwroot/studybridge/.env`（600，含 `AUTH_SECRET` / `GATE_PASSWORD` / Turnstile 密钥） |

### Demo 账号（密码均为 `demo1234`）

> 2026-10-09：登录页已**移除演示账号展示卡片**（不再对前端展示任何测试账密）；
> 以下账号仍保留在库中（登录页已无本地登录表单，暂无 UI 登录入口），仅本 README 记录。如需彻底清空演示账号及其数据，
> 直接删除对应用户行即可（教员/家长演示内容随级联删除），`npm run db:seed` 可随时重新生成。

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
scripts/allow-overseas-only.sh remove 38081    # 撤销（当前有意保留：仅防端口直连，域名入口不受影响）

# 防火墙备份（改动前的存档）
ls /root/firewalld-backup-*.tar.gz
```

### 访问控制说明（重要）

1. **唯一公开入口是 https://x.mingyanginfo.com**（nginx 443 → 本机回环 38081 反代），境内境外均可访问。
2. **38081 直连已彻底关闭**：应用仅绑定 `127.0.0.1`；firewalld 仅保留 `127.0.0.1 → 38081 accept` 一条规则，
   端口未对外放行。SSH(22)、nginx(80/443)、宝塔(18888)、MySQL 等不受影响。
   （原「仅境外 IP」地域规则与 `cn_ipv4` ipset 已删除，`studybridge-cnipset.timer` 已停用；
   `scripts/allow-overseas-only.sh` 脚本保留，未来新增端口如需地域策略可复用。）
3. **人机验证（Turnstile）覆盖**（纯 SSO 化后的完整地图，防滥用体系）：
   - **学桥**：门禁页（action `sb-gate`，专用小组件 `0x4AAAAAAFSNtlhO5abzeCKN`）——所有访客的第一道关，
     先过验证才可能到达站内任何页面；登录页（纯 SSO）与注册引导页均在其后，且本身无可提交表单
     （只有跳转按钮），故不再挂组件
   - **login 服务**：登录页（`login`）与注册页（`register`）各挂组件（`0x4AAAAAAFQdjWIRGrxnT-3S`），
     **凭据提交与注册动作前强制过验证**（防撞库 / 机器人注册）——即使未来学桥门禁开放，这一层仍在
   服务端 `src/lib/turnstile.ts` 强制校验：`success === true` + action 一致 + hostname 在
   `TURNSTILE_ALLOWED_HOSTNAMES` 白名单内（默认 `x.mingyanginfo.com`），超时 10s。
   前端组件 `src/components/Turnstile.tsx`（显式渲染；提交后 token 即失效，靠 `key` 重挂载刷新）。
   **Cloudflare 控制台里两个小组件的域名列表必须分别包含 `x.mingyanginfo.com` 与
   `login.mingyanginfo.com`**，否则对应页面组件无法渲染（学桥侧会导致门禁无法进入）。
   **更换/轮换密钥**：`bash scripts/turnstile-set-secret.sh`（secret 不回显、写入前先做有效性探测、
   原子替换 .env 并重启校验，全程不进命令行参数与日志）。
4. **应用层口令门 `GATE_PASSWORD` 必须保持设置**（当前为内测期，仅受邀访问）。
   **SSO 握手端点（`/api/auth/sso/*`）豁免门禁**——否则回调携带的 ticket 会被门禁重定向丢掉、
   登录链路断裂（2026-10-09 已修的坑）；其余页面全部受门禁保护，过门禁后按 `next` 参数回到原目标
   （保留完整路径与查询串）。
   清空该值即对全网公开（仍受 Turnstile 保护）——待对外发布时再清（并重启服务）。
5. **`COOKIE_SECURE=1` 已启用**：Cookie 只随 HTTPS 传输。一律用域名 https 访问，
   不要再用 `http://IP:端口`（现该通道已关闭）。
6. **账号统一（2026-10-09 已上线）**：学桥登录入口统一到 `login.mingyanginfo.com`（明旸账号 SSO）——
   用户只注册一次、只绑一次 2FA，学桥侧首登选择身份（家长/教员）。**运营账号也走明旸账号**：
   在 `.env` 的 `SSO_ADMIN_USERNAMES` 白名单里的明旸用户名登录后自动成为 ADMIN、直达后台；
   登录页已**纯 SSO 化**（本地登录表单已整体移除；后端本地登录代码路径保留，需要时可随时恢复 UI）。SSO 用户本地密码被拒。
   详见下方「SSO 账号统一」小节。

### SSO 账号统一（2026-10-09 上线）

**流程**：学桥 `/login` 主按钮 → `/api/auth/sso/start`（生成 state）→ 跳 `login.mingyanginfo.com/sso/authorize`
（未登录先走明旸账号密码 + TOTP；已登录直接签发）→ 60 秒一次性 ticket 回跳
`/api/auth/sso/callback`（state 比对 + 服务端携带 client_secret 换身份）→ 按 `ssoSub` 映射本地用户
（首次登录 → `/welcome` 选身份）→ 建立学桥 `sb_session`。

**运营账号**：明旸用户名列入 `.env` 的 `SSO_ADMIN_USERNAMES`（逗号分隔，不区分大小写）即自动获得
ADMIN 角色、跳过选身份直进 `/admin`；当前白名单：`couv`、`zhougaofan`。
⚠️ 若某白名单账号要从 login 服务删除，务必同步把它从白名单移除（否则该用户名被他人注册后会误获运营权限）。
登录页已无本地表单；本地 `admin@studybridge.cn` 保留在库中备用（login 服务故障时可临时恢复表单入口，或直接运维处理）。

**安全要点**：ticket 一次性 + 60 秒 + 绑定 client_id/redirect_uri；`/sso/verify` 常数时间比对
secret（sha256 存储于 login 服务库，明文只在本站点 .env）、失败按 client_id+IP 限频；state 防 CSRF；
redirect_uri 白名单精确匹配；SSO 用户访问 `/admin` 一律被角色中间件拒绝。

**运维/排坑**：
- `.env` 中 `SITE_ORIGIN=https://x.mingyanginfo.com`：反代下 Next 内部 `req.url` 是 `localhost:38081`
  （不信任 Host/X-Forwarded-Host），**中间件重定向必须用它拼绝对地址**；路由处理器用相对 Location。
  换域名时要同步改：`SITE_ORIGIN` + `SSO_REDIRECT_URI` + login 服务 `sso_clients.redirect_uris`。
- 轮换 SSO 密钥：login 库更新 `sso_clients.client_secret_hash`（sha256 新值）→ 同步改本 .env
  `SSO_CLIENT_SECRET` → `systemctl restart studybridge`。
- 回滚：清空本 .env 的 `SSO_*` 即 SSO 入口报错提示；本地账号密码登录不受影响（见方案文档第五节）。

### 访问验证

```bash
# 任意机器（境内境外均可）；http 应 301 跳 https
curl -I https://x.mingyanginfo.com/          # 应 307 → /gate
curl -I http://x.mingyanginfo.com/           # 应 301 → https
# 直连端口（任意机器）：连接失败/超时（设计行为，已彻底关闭）
curl -I -m 3 http://150.158.55.8:38081/      # 000
```

---

## 非文本数据存储（腾讯云 COS，2026-10-09 接入）

认证材料（学生证/成绩单）等非文本数据存于**腾讯云 COS**（桶内前缀 `tutor-materials/`），
默认**浏览器直传**：选文件 → 服务端签发一次性预签名 PUT（5 分钟、仅该对象）→ 浏览器直传 COS →
表单只提交对象名。查看仍走 `/api/uploads/<name>` 鉴权转发（仅管理员与本材料本人可看，隐私策略不变）。

- 配置：`.env` 的 `COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION`；用
  `bash scripts/set-cos-env.sh` 录入（密钥不回显、不进聊天/日志），脚本自动完成
  CORS 配置、桶权限检查、密钥连通性自检与本地旧材料迁移
- 回退链：COS 未配置/直传失败 → 服务端中转上传（仍进 COS）；未配置且无文件 → 本地 `uploads/` 旧逻辑
- 对象名绑定上传者（`card-u<uidTag>-...`），防止伪造指向他人材料的对象名
- 建议：桶权限保持**私有读写**；子账号密钥仅授权该桶
- **桶名易混提醒**：账号下现有两个桶——`xueqiao-1314767018`（**本应用在用**）与
  `cos1-1314767018`（已弃用，可删）；两桶名字相近，控制台操作（CORS 等）务必认准 `xueqiao`
- CORS 已在 `xueqiao` 桶配置并实测生效（预检放行学桥域名、跨域 PUT 成功、非法来源被拒）；
  该桶为「角色模式」，子账号 API 无权改桶配置，CORS 如需调整请在控制台操作：
  安全管理 → 跨域访问 CORS 设置 → 来源 `https://x.mingyanginfo.com`、操作 `PUT, GET, HEAD`、
  Allow-Headers `*`、Expose-Headers `ETag`、超时 600 秒
- 已验收（2026-10-09 切换 xueqiao 桶后复验）：密钥连通、旧材料迁移（字节一致）、
  预签名直传 → 表单绑定 → 鉴权转发全链路 7/7、CORS 全套 7/7、匿名公网访问实测被拒（桶私有）

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
| `GATE_PASSWORD` | **站点口令门**，留空则关闭口令门（内测期务必保持设置） |
| `HOST` / `PORT` | 生产 `127.0.0.1` / `38081`（仅回环，勿改回 0.0.0.0） |
| `COOKIE_SECURE` | Cookie 的 Secure 标记，已接 HTTPS 保持 `1` |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile 站点公钥（公开值；学桥专用小组件） |
| `TURNSTILE_SECRET_KEY` | Turnstile 私钥（机密；未配置时校验自动跳过，便于本地开发） |
| `TURNSTILE_ALLOWED_HOSTNAMES` | 可选。siteverify hostname 白名单，逗号分隔，默认 `x.mingyanginfo.com` |
| `SITE_ORIGIN` | 站点对外源（`https://x.mingyanginfo.com`）。反代下中间件重定向依赖它拼绝对地址，勿删 |
| `SSO_ISSUER` | 明旸登录服务地址（`https://login.mingyanginfo.com`） |
| `SSO_CLIENT_ID` | SSO 客户端标识（`studybridge`） |
| `SSO_CLIENT_SECRET` | SSO 服务端换身份密钥（机密；login 侧仅存 sha256 哈希） |
| `SSO_REDIRECT_URI` | 回调地址（`https://x.mingyanginfo.com/api/auth/sso/callback`，须与 login 白名单一致） |
| `SSO_ADMIN_USERNAMES` | 运营白名单：明旸用户名（逗号分隔，不区分大小写），命中者 SSO 登录后自动成为 ADMIN |

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
- ICP 备案已完成（陕ICP备2026028201号），域名 x.mingyanginfo.com 已正式上线。
- 后续按当地要求完成经营性/非经营性备案的后续手续（如涉及经营性电信业务需另行申请）。
