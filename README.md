<div align="center">

# Check CX

**When your AI API goes down, you should be the first to know.**

English | [简体中文](README_ZH.md)

Check CX continuously probes the availability and latency of AI model APIs like OpenAI / Gemini / Anthropic, and turns the results into a clear, shareable status board — outages become visible instantly, slowness becomes provable.

</div>

![Check CX Dashboard](docs/images/index.png)

## Why Check CX

- **Relay providers are flaky, and you never know which hop is the problem.** Check CX sends real model requests, measuring end-to-end availability — not just whether the port answers.
- **Some relays return fake responses to fool health checkers.** Every Check CX probe is a randomly generated language challenge; a wrong answer marks the endpoint as down — canned-text fake proxies can't hide.
- **When users report issues, you need evidence.** 7/15/30-day uptime stats and a history timeline turn "occasional timeouts" into a quantifiable curve.
- **You need a status page you can put on your site.** Grouped views, website links, and a public read-only status API — works out of the box.

## Highlights

### 🩺 Real-Request Health Checks

No fake probes — every check is a real streaming model call, capturing the true time-to-first-token (immune to endpoints streaming empty chunks to fake latency) plus endpoint ping latency. Supports both Chat Completions and Responses endpoints; Gemini is auto-detected between the native Google API and OpenAI-compatible formats; reasoning models like o1 / GPT-5 / DeepSeek-R1 / QwQ automatically get reasoning-effort configuration.

### 🧠 Random Challenge Validation — Built to Catch Fake Relays

Each check generates a fresh language challenge on the fly (category selection, reading comprehension, state tracking, logical implication, instruction following — 5 difficulty tiers) and requires the model to produce the one correct answer. Random guessing almost never passes — proxies that return canned text get exposed on the spot.

### 📊 Model Capability Assessment

Health checks also sample high-difficulty challenges (tiers 3–5), shown as an intelligence score on each card, with per-tier pass rates on hover. Failing a hard challenge affects the capability score, not the health status — weak models don't flap, but capability differences are visible at a glance.

### 📈 History Timeline & Uptime Stats

Every model card has a response-time timeline and 7/15/30-day uptime stats, so you can instantly tell "rock solid" from "occasionally flaky".

### 🔄 Live Config Reload

Changed a model config in the admin panel? The frontend watches for config changes over SSE and refreshes automatically — no F5 required.

### 🗂️ Grouped Views

Group models by provider or relay, each group with its own tags and website link, plus a dedicated group detail page. A hundred models still stay tidy.

### 📢 Official Status Sync

Automatically polls the official status pages of OpenAI and Anthropic — if your own probes are all green but the provider is having an incident, the cause is obvious.

### 🛠️ Maintenance Mode & Notification Banners

Taking a model offline for maintenance? Enable maintenance mode: the card stays, polling stops, and status no longer turns red. Supports multiple Markdown notification banners in rotation (info / warning / error levels) — enough for maintenance and change announcements.

### 🌐 Read-Only Status API

`GET /api/v1/status` returns structured status data — hook it up to uptime robots, alerting bots, or your own systems.

### 🎨 Dark Mode

One-click light/dark theme toggle, follows your system preference automatically.

### 🏗️ Production-Ready Design

- Multi-node deployments auto-elect a leader (via database leases) — run as many replicas as you like without duplicate polling.
- Automatic retries on network hiccups — transient aborts never cause false alarms.
- API keys live only in the database and are read only server-side — never in the frontend or config files.
- History data is pruned automatically by retention days.

## Getting Started

### Docker (Recommended)

```bash
mkdir check-cx && cd check-cx
wget https://raw.githubusercontent.com/BingZi-233/check-cx/main/docker-compose.yml

# Prepare environment variables
cat > .env <<'EOF'
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_OR_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
EOF

docker compose up -d
```

Open `http://localhost:3000` to see the dashboard.

### Local Development

Requirements: Node.js >= 22, pnpm 10, and a Supabase project.

```bash
pnpm install
cp .env.example .env.dev   # Note: pnpm dev reads .env.dev
pnpm dev
```

First run: initialize the database and add monitoring configs.

1. Run `supabase/schema.sql` to create tables (for existing databases, run `supabase/migrations/` in order).
2. Add models and configs (sample SQL below, or just use the admin panel).

```sql
-- 1) Create the model first
INSERT INTO check_models (type, model)
VALUES ('openai', 'gpt-4o-mini')
ON CONFLICT (type, model) DO NOTHING;

-- 2) Then create the config instance
INSERT INTO check_configs (name, type, model_id, endpoint, api_key, enabled)
SELECT 'OpenAI GPT-4o', 'openai', id,
       'https://api.openai.com/v1/chat/completions',
       'sk-your-api-key', true
FROM check_models
WHERE type = 'openai' AND model = 'gpt-4o-mini';
```

## Admin Panel

No SQL needed for day-to-day maintenance of models, configs, groups, and notifications — use the companion admin panel [`check-cx-admin`](https://github.com/BingZi-233/check-cx-admin) (GitHub OAuth login, same Supabase database).

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Yes | - | Supabase publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Service Role Key (server-side only, never expose) |
| `CHECK_NODE_ID` | No | `local` | Node identity, used for multi-node leader election |
| `CHECK_POLL_INTERVAL_SECONDS` | No | `60` | Poll interval (15–600s) |
| `CHECK_CONCURRENCY` | No | `5` | Max concurrency (1–20) |
| `OFFICIAL_STATUS_CHECK_INTERVAL_SECONDS` | No | `300` | Official status poll interval (60–3600s) |
| `HISTORY_RETENTION_DAYS` | No | `30` | History retention days (7–365) |

### Status API

- `GET /api/dashboard?trendPeriod=7d|15d|30d` — Dashboard aggregate data (with ETag)
- `GET /api/group/[groupName]?trendPeriod=7d|15d|30d` — Group detail data
- `GET /api/v1/status?group=...&model=...` — Public read-only status API

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Extending Providers](docs/EXTENDING_PROVIDERS.md)

## License

[MIT](LICENSE)
