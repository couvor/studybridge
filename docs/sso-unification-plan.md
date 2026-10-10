# 学桥 × 明旸登录服务 · 账号统一方案（备案后执行）

> ## ✅ 已执行（2026-10-09）
> 实现偏差记录（与本文档的差异，均为执行时的实际决策）：
> 1. 学桥域名实际为 **x.mingyanginfo.com**（非文中的 jiajiao.mingyanginfo.com），所有回调/白名单以此为准。
> 2. `client_secret` **不落 `/etc/loginapp.env`**：login 侧仅存 sha256 哈希（`sso_clients` 表），
>    明文只写入学桥 `.env`（`SSO_CLIENT_SECRET`）——密钥单点存放，少一处暴露面。
> 3. `GET /sso/logout` 未实现（文档中即标记"可选"）：验收项"任一边退出不影响另一边"按两套会话独立达成。
> 4. 实现期发现的坑（已修，勿踩）：nginx 反代下 Next 内部 `req.url` 恒为 `localhost:38081`
>    （不信任 Host / X-Forwarded-Host），**中间件重定向必须用 `.env` 的 `SITE_ORIGIN` 拼绝对地址**；
>    路由处理器用相对 Location 的 `Response`。44 项服务端验收（19 全流程 + 4 续接 + 10 IdP +
>    9 Turnstile 回归 + 管理面隔离）全部通过。
> 5. 本地登录保留路径同时服务 demo 账号（`authSource=LOCAL`），SSO 用户（`authSource=SSO`）
>    本地密码登录被拒并提示走明旸账号（回滚能力见第五节，实测可用）。
> 6. **原"ADMIN 不进 SSO"决策已被用户推翻（2026-10-09 晚）**：运营账号改走明旸账号——
>    实现为 `.env` 的 `SSO_ADMIN_USERNAMES` 用户名白名单（命中即 ADMIN、跳过选身份直进 /admin；
>    当前含 couv、zhougaofan）；登录页本地登录表单已整体移除（纯 SSO 化），
>    本地 admin@studybridge.cn 留库备用（故障时恢复表单或运维处理）。
>    ⚠️ 白名单账号若从 login 服务删除，必须同步移出白名单，否则用户名被他人注册会误获运营权限。

> 决策（2026-10-08）：**备案通过后**，学桥接入 `login.mingyanginfo.com` 作为唯一登录入口，
> 用户只注册一次、只绑一次 2FA；学桥侧首次登录时选择「家长 / 教员」角色。
> 备案期间两边并行、互不干扰，**本方案不执行**。

## 一、现状（为什么现在不动）

| | login.mingyanginfo.com（旧） | 学桥（新） |
|---|---|---|
| 入口 | nginx 80 → 127.0.0.1:3000（Express） | 直连 Node `0.0.0.0:38081` |
| Cookie | `mysid`（host-only） | `sb_session` / `sb_gate` |
| 会话存储 | `/var/lib/loginapp/app.db` | `/www/wwwroot/studybridge/prisma/dev.db` |
| 账号能力 | 注册 / bcrypt(12) / TOTP 2FA / 恢复码 / Turnstile / 限频 | 角色（家长/教员/运营），无 2FA |

两边主机名、Cookie 名、会话库全部隔离，**无技术冲突**；问题在于用户要维护两套账号。
学桥当前跑在 `IP:38081`，没有域名，此刻做跨域单点登录只能做出一次性方案，因此推迟到备案后。

## 二、目标形态

```
浏览器 → https://jiajiao.mingyanginfo.com（学桥）
            │ 未登录
            ▼
        https://login.mingyanginfo.com/sso/authorize?client_id=studybridge&redirect_uri=...&state=...
            │ 已有会话 → 直接发 ticket
            │ 无会话   → 走旧站既有登录（密码 + TOTP 2FA）
            ▼
        redirect_uri?ticket=<一次性票据>&state=...
            ▼
   学桥 /api/auth/sso/callback
            │ 服务端向 login 服务换身份（client_secret 校验）
            ▼
   映射本地用户（首次登录 → 选择家长/教员）→ 建立学桥自有会话 sb_session
```

要点：
- **票据一次性**：32 字节随机、60 秒有效、用后即焚，绑定 `client_id` 与 `redirect_uri`。
- **换身份走服务端到服务端**：`client_secret` 只存在两台服务器的 env 里，不经过浏览器。
- **state 防 CSRF**：学桥生成随机 state 存 cookie，回调时比对。
- **redirect_uri 白名单**：login 服务侧只允许预先登记的地址，防开放重定向。
- **运营（ADMIN）不进 SSO**：后台账号继续用学桥本地密码登录，避免把管理权限暴露给公共注册入口。

## 三、需要改动的代码

### 3.1 login 服务（login.mingyanginfo.com，Express）

1. 新表（`/var/lib/loginapp/app.db`）：
   ```sql
   CREATE TABLE sso_clients (
     client_id TEXT PRIMARY KEY,
     client_secret_hash TEXT NOT NULL,      -- sha256(secret)
     redirect_uris TEXT NOT NULL            -- 逗号分隔白名单
   );
   CREATE TABLE sso_tickets (
     ticket TEXT PRIMARY KEY,               -- 32B hex
     client_id TEXT NOT NULL,
     user_id INTEGER NOT NULL,
     redirect_uri TEXT NOT NULL,
     expires_at TEXT NOT NULL,              -- 签发 +60s
     used INTEGER NOT NULL DEFAULT 0
   );
   ```
2. 新路由：
   - `GET /sso/authorize`：校验 `client_id` / `redirect_uri`（白名单）→ 无会话则跳既有登录（登录后回到本端点）→ 有会话则签发 ticket 并 302 回 `redirect_uri?ticket&state`。
   - `POST /sso/verify`：`{ticket, client_id, client_secret}` → 校验 secret（常数时间比较）、ticket 未过期未使用 → 标记 used → 返回 `{sub, email, displayName}`。失败一律 401，不区分原因。
   - `GET /sso/logout?redirect_uri=...`（可选）：清 login 侧会话后回跳。
3. 复用既有设施：CSRF token、限频（`/sso/verify` 按 client_id + IP 限频）、响应头加固不变。

### 3.2 学桥（Next.js）

1. Prisma schema：
   ```prisma
   model User {
     // …
     ssoSub     String?  @unique   // login 服务的用户 ID（SSO 用户）
     authSource String   @default("LOCAL")  // LOCAL | SSO
     rolePending Boolean @default(false)    // SSO 首登待选角色
   }
   ```
2. 新增路由/动作：
   - `GET /api/auth/sso/start`：生成 state → 302 到 login 服务的 `/sso/authorize`。
   - `GET /api/auth/sso/callback`：比对 state → 调 `/sso/verify` → 按 `ssoSub` 查/建用户 → `rolePending` 时跳 `/welcome` 选角色（家长/教员）→ 建立 `sb_session`。
   - `/login` 页改为：主按钮「使用明旸账号登录」；仅当邮箱属于 ADMIN 时显示本地密码表单。
3. 登录页与注册页：注册入口移除（改由 login 服务承担），`/register` 保留为「去登录服务注册」的跳转说明页。

### 3.3 配置

| 位置 | 变量 | 说明 |
|---|---|---|
| `/etc/loginapp.env` | `SSO_STUDYBRIDGE_SECRET=<随机>` | login 侧校验用 |
| 学桥 `.env` | `SSO_ISSUER=https://login.mingyanginfo.com`、`SSO_CLIENT_ID=studybridge`、`SSO_CLIENT_SECRET=<同上>`、`SSO_REDIRECT_URI=https://jiajiao.mingyanginfo.com/api/auth/sso/callback` | 学桥侧 |

密钥不进聊天/日志：用 `read -rsp` 方式各自写入（沿用旧站既有纪律）。

## 四、执行顺序（与备案上线清单合并）

1. **DNS**（备案通过后，Cloudflare 灰云 DNS only）：
   `login` A → 150.158.55.8；`jiajiao` A → 150.158.55.8
2. **证书**：宝塔为两个站点各签一张（login 站点的 ACME 目录已就绪）。
3. **login 服务上线**：vhost 加 443、移除 Basic Auth 门禁段、`COOKIE_SECURE=1`、reload nginx。
4. **学桥接入域名**：新增 nginx vhost `jiajiao.mingyanginfo.com` → 反代 `127.0.0.1:38081`；
   学桥改绑 `127.0.0.1`（`HOST=127.0.0.1`，systemd 单元同步改）；执行
   `scripts/allow-overseas-only.sh remove 38081` 解除地域限制（此后由 nginx 承接 80/443）。
5. **实现 SSO**：按第三节改两个应用 → 各自重启 → 用密钥写入配置。
6. **验证清单**：
   - 未登录访问 `jiajiao` → 跳 login → 密码 + 2FA → 回跳 → 选角色 → 进入家长中心；
   - 二次访问免登录直达；任一边退出不影响另一边；
   - ticket 重放被拒、过期被拒、错误 secret 被拒、非白名单 redirect_uri 被拒；
   - ADMIN 走本地密码登录仍可进 `/admin`；SSO 用户访问 `/admin` 被拒。
7. **收尾**：学桥 seed 里的 demo 账号保留为运营/演示用；对外的家长/教员账号一律经 SSO 产生。

## 五、回滚

SSO 上线后若 login 服务不可用，学桥的 SSO 入口会 502——保留学桥本地登录代码路径（`authSource=LOCAL` 的账号仍可用密码登录）
即可随时降级；两套账号可长期并存，互不覆盖（`ssoSub` 为空即本地账号）。

## 六、风险与对策

| 风险 | 对策 |
|---|---|
| 开放重定向 | `redirect_uri` 必须命中 `sso_clients` 白名单，精确匹配 |
| 票据被抢注 | ticket 一次性 + 60s + 服务端换取时校验 client_id/secret |
| 公共注册污染管理面 | ADMIN 不进 SSO；SSO 用户访问 `/admin` 一律 403/回跳 |
| 首登角色选错 | `/welcome` 选角色页允许在「未产生业务数据前」自助切换一次 |
| 依赖单点 | 保留本地登录路径用于降级（见第五节） |
