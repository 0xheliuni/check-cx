<div align="center">

# Check CX

**你的 AI API 挂了，第一个知道的人应该是你。**

[English](README.md) | 简体中文

Check CX 持续探测 OpenAI / Gemini / Anthropic 等 AI 模型 API 的可用性与延迟，把结果变成一块清晰、可直接分享的状态面板——挂了立刻可见，慢了有据可查。

</div>

![Check CX Dashboard](docs/images/index.png)

## 为什么需要 Check CX

- **中转站不稳定，但你不知道是哪一环的问题。** Check CX 直接发真实模型请求，测的是端到端可用性，不只是端口通不通。
- **有些中转会返回假响应糊弄探测器。** Check CX 每次检查都是一道随机语言挑战题，答案对不上就判故障——固定文本的假中转无处遁形。
- **用户报障时，你需要证据。** 7/15/30 天可用性统计与历史时间线，让"偶发超时"变成可量化的曲线。
- **你需要一块能直接挂官网的状态页。** 分组视图、官网链接、公开只读状态 API，开箱即用。

## 功能亮点

### 🩺 真实请求健康检查

不做假探测——每个检查都是一次流式真实模型调用，采集真实首字延迟（防端点吐空流伪造数据）与端点 Ping 延迟。支持 Chat Completions 与 Responses 端点；Gemini 自动识别原生 Google API 与 OpenAI 兼容格式；o1 / GPT-5 / DeepSeek-R1 / QwQ 等推理模型自动配置推理强度。

### 🧠 随机挑战验证，专治假中转

每次检查动态生成一道语言挑战题（分类选择、阅读理解、状态追踪、逻辑蕴涵、指令遵循，5 档难度），要求模型给出唯一正确答案。瞎猜命中率极低——返回固定文本的假代理当场现形。

### 📊 模型能力评估

健康检查顺带采样高难度挑战（难度 3–5），卡片上展示智能评估得分，悬停可看各难度档通过率。答错高难题不影响健康状态，只影响能力分——弱模型不会健康抖动，但能力差异一目了然。

### 📈 历史时间线与可用性统计

每个模型卡片都有响应时间线与 7/15/30 天可用率统计，一眼看出"一直稳"还是"间歇抽风"。

### 🔄 配置实时生效

管理后台改了模型配置？前端通过 SSE 监听配置变更，面板自动刷新，不用手搓 F5。

### 🗂️ 分组展示

按供应商或中转站分组展示，每个分组可配置标签与官网链接，独立分组详情页。挂一百个模型也不乱。

### 📢 官方状态联动

自动轮询 OpenAI 与 Anthropic 官方状态页——自家探测全绿但官方在事故，问题在哪一目了然。

### 🛠️ 维护模式与通知横幅

某个模型要下线维护？开启维护模式：卡片保留、停止轮询、状态不再变红。支持多条 Markdown 通知横幅轮播（info / warning / error 三级），公告维护、变更都够用。

### 🌐 只读状态 API

`GET /api/v1/status` 输出结构化状态数据，接 uptime robot、告警机器人或你自己的系统都可以。

### 🎨 深色模式

亮暗主题一键切换，自动跟随系统。

### 🏗️ 生产级设计

- 多节点部署自动选主（数据库租约），起几个副本都不怕重复轮询。
- 网络抖动自动重试，偶发 aborted 不误报。
- API key 只存数据库、只在服务端读取，绝不出现在前端或配置文件里。
- 历史数据自动按保留天数清理。

## 快速开始

### 一键栈（Docker，推荐）

`docker-compose.yml` 打包了完整的 [Supabase self-hosting 栈](https://github.com/supabase/supabase/tree/master/docker)（Postgres、PostgREST、GoTrue、Storage、Realtime、Studio、API 网关），外加 Check CX 面板与管理后台。首次启动自动建表——不需要云 Supabase 项目，不需要手动执行 SQL。

```bash
git clone https://github.com/BingZi-233/check-cx.git
cd check-cx
cp .env.example .env
docker compose up -d
```

访问：

- **面板** `http://localhost:3000` —— 零配置可用
- **管理后台** `http://localhost:3001` —— 登录需配置 GitHub OAuth（见下）
- **Supabase API** `http://localhost:8000`

所有可调项都在 `.env`（带注释，基于上游 Supabase `.env.example` 加 Check CX 变量）。

#### 开启管理后台登录

管理后台通过 Supabase Auth 走 GitHub OAuth 登录。创建一个 GitHub OAuth 应用，回调地址填 `http://<主机IP或域名>:8000/auth/v1/callback`（同机即 `http://localhost:8000/auth/v1/callback`），然后在 `.env` 中配置：

```env
GITHUB_ENABLED=true
GITHUB_CLIENT_ID=...
GITHUB_SECRET=...
ADMIN_EMAILS=your@email.com
# 同机访问可保持默认；局域网/公网访问改为 http://<主机IP或域名>:3001
APP_URL=http://localhost:3001
```

#### 生产部署

栈出厂使用公开演示 JWT 与默认密码——对外暴露前务必全部替换。用 vendored 的上游脚本生成生产密钥，写入 `.env`：

```bash
sh docker/supabase-stack/utils/generate-keys.sh       # 生成 JWT_SECRET / ANON_KEY / SERVICE_ROLE_KEY 等
```

至少替换：`POSTGRES_PASSWORD`、`JWT_SECRET`、`ANON_KEY`、`SERVICE_ROLE_KEY`、`DASHBOARD_USERNAME/PASSWORD`、`SECRET_KEY_BASE`、`VAULT_ENC_KEY`、`PG_META_CRYPTO_KEY`。局域网/公网访问还需将 `SUPABASE_PUBLIC_URL`、`API_EXTERNAL_URL`、`APP_URL`、`SUPABASE_URL` 设为主机实际地址。

已有云 Supabase 项目？在 `.env` 设置 `SUPABASE_URL` 与对应 key，面板与管理后台会继续使用云端数据库（本地 Supabase 栈闲置运行）。

### 本地开发

要求：Node.js >= 22，pnpm 10，一个 Supabase 项目。

```bash
pnpm install
cp .env.example .env.dev   # 注意：pnpm dev 读取的是 .env.dev
pnpm dev
```

首次运行需要初始化数据库并添加监控配置：

1. 执行 `supabase/schema.sql` 初始化表结构（已有数据库则按顺序执行 `supabase/migrations/`）。
2. 添加模型与配置（示例 SQL 见下方，或直接用管理后台操作）。

```sql
-- 1) 先创建模型
INSERT INTO check_models (type, model)
VALUES ('openai', 'gpt-4o-mini')
ON CONFLICT (type, model) DO NOTHING;

-- 2) 再创建配置实例
INSERT INTO check_configs (name, type, model_id, endpoint, api_key, enabled)
SELECT 'OpenAI GPT-4o', 'openai', id,
       'https://api.openai.com/v1/chat/completions',
       'sk-your-api-key', true
FROM check_models
WHERE type = 'openai' AND model = 'gpt-4o-mini';
```

## 管理后台

日常维护模型、配置、分组、通知不需要写 SQL——用配套管理后台 [`check-cx-admin`](https://github.com/BingZi-233/check-cx-admin)（GitHub OAuth 登录，同一 Supabase 数据库）点点点即可。

## 配置参考

### 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|---|---|---|---|
| `SUPABASE_URL` | 是 | - | Supabase 项目 URL |
| `SUPABASE_PUBLISHABLE_OR_ANON_KEY` | 是 | - | Supabase 公共访问 Key |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | - | Service Role Key（服务端使用，勿暴露） |
| `CHECK_NODE_ID` | 否 | `local` | 节点身份，多节点选主用 |
| `CHECK_POLL_INTERVAL_SECONDS` | 否 | `60` | 检测间隔（15–600 秒） |
| `CHECK_CONCURRENCY` | 否 | `5` | 最大并发（1–20） |
| `OFFICIAL_STATUS_CHECK_INTERVAL_SECONDS` | 否 | `300` | 官方状态轮询间隔（60–3600 秒） |
| `HISTORY_RETENTION_DAYS` | 否 | `30` | 历史保留天数（7–365） |

### 状态 API

- `GET /api/dashboard?trendPeriod=7d|15d|30d` — Dashboard 聚合数据（带 ETag）
- `GET /api/group/[groupName]?trendPeriod=7d|15d|30d` — 分组详情数据
- `GET /api/v1/status?group=...&model=...` — 对外只读状态 API

## 文档

- [架构说明](docs/ARCHITECTURE.md)
- [运维手册](docs/OPERATIONS.md)
- [Provider 扩展](docs/EXTENDING_PROVIDERS.md)

## 许可证

[MIT](LICENSE)
