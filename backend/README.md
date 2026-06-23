# Vegasphere Backend

Node.js + Express API for Vegasphere: authentication, messaging, conversations, calls, status, search, networking, local AI, and real-time updates over Socket.IO.

**Monorepo overview:** [../README.md](../README.md)

---

## Quick start

```bash
cd backend
npm install
# Create backend/.env (see Environment variables below).
# If you have a backup: Copy-Item .env.secrets-backup .env
npm run dev            # node --watch index.js → http://localhost:5500
```

Minimum `.env` for local dev:

| Variable | Example |
|----------|---------|
| `JWT_SECRET` | any non-empty string (strong in production) |
| `MONGO_URI` | `mongodb://localhost:27017/vegasphere` |
| `CORS_ORIGINS` | `http://localhost:3001,http://127.0.0.1:3001` |
| `PUBLIC_APP_URL` | `http://localhost:3001` |

MongoDB must be running. Redis, SMTP, VAPID, and S3 are optional — configure once in `backend/.env` and do not regenerate keys on each run. A local backup can live at `.env.secrets-backup` (gitignored).

Pair with the Next.js frontend on port **3001** (`cd frontend-next && npm run dev`).

---

## How a request flows

```
Client
  → index.js (requestId, rateLimit, helmet, cors, body parser, upload download middleware)
  → routes/*.routes.js (path + validate + fetch_user)
  → controllers/<domain>/ (business logic)
  → models/* + services/*
  → { success: true, data: ... } OR ApiError → error_handler
```

- **Socket events:** `socket/index.js`, `socket/handlers.js`, `socket/message.handlers.js`
- **Domain events:** controllers publish via `services/event-bus.js` (no direct Socket.IO imports in controllers)
- **Background jobs:** `schedulers.js` (scheduled send, disappearing messages, delivery retries, call reminders, ban cleanup)

---

## API route prefixes

| Prefix | Route file | Purpose |
|--------|------------|---------|
| `/` | `health.routes.js` | `GET /health`, `GET /ready` |
| `/auth` | `auth.routes.js` | Register, login, password reset, 2FA, sessions, email verify |
| `/user` | `user.routes.js` | Profile, presence, inbox, blocks, push, E2E keys, notifications, account |
| `/message` | `message.routes.js` | Send, upload, receipts, search, threads, export, live location |
| `/conversation` | `conversation.routes.js` | DMs, groups, channels, topics, invites, moderation |
| `/join` | `join.routes.js` | Public join-by-token |
| `/search` | `search.routes.js` | Global search |
| `/utility` | `utility.routes.js` | GeoIP, link previews |
| `/status` | `status.routes.js` | Status stories |
| `/ai` | `ai.routes.js` | Translation + smart replies (local engine) |
| `/calls` | `call.routes.js` | Call invites, history, ICE servers |
| `/networking` | `networking.routes.js` | Networking posts feed |

Static uploads: `/uploads` (with `middleware/upload_download.js` for `?download=1&filename=` attachment downloads). Local disk by default; optional S3/R2 via `services/object-storage.js`.

---

## Response shape

**Success:** `{ "success": true, "data": ... }` — optional `"message"`.

**Error:** `{ "success": false, "message": "...", "details": ... }` — may include `requestId`.

Authenticated routes: header **`auth-token`** (JWT).

The Next.js client unwraps `data` automatically in `frontend-next/src/lib/api.ts`.

---

## Directory layout

```
backend/
├── index.js              # Express app, routes, HTTP server, Socket.IO, schedulers
├── database.js           # MongoDB connect/disconnect
├── schedulers.js         # Interval jobs (messages, calls, conversations, delivery)
├── config/
│   ├── env.js            # JWT, CORS, body limits, rate limiting, ICE, S3, production checks
│   └── helmet.js         # Security headers (CORS-aware connect-src for WebSocket)
├── middleware/
│   ├── request_id.js     # X-Request-Id tracing
│   ├── rate_limit.js     # Global rate limit (on in production)
│   ├── fetch_user.js     # JWT + session → req.user
│   ├── validate.js       # Zod validation
│   ├── error_handler.js  # JSON error mapping
│   └── upload_download.js
├── routes/               # Express routers (one file per API prefix)
├── validators/           # Zod schemas per domain
├── models/               # Mongoose schemas
├── controllers/          # HTTP + socket handlers, grouped by domain
├── services/             # Shared business logic, integrations, AI engine
├── socket/               # Socket.IO server + event handlers
├── data/                 # Local AI datasets (SQLite + JSON fallbacks)
└── uploads/              # Runtime media (avatars, messages, status) — gitignored
```

### `models/`

| Model | Role |
|-------|------|
| `User.js` | Accounts, sessions, presence, push subscriptions, privacy |
| `Conversation.js` | DMs, groups, channels, members, topics, bans |
| `Message.js` | Messages, reactions, threads, scheduled/disappearing |
| `Status.js` | Status stories |
| `Notification.js` | In-app notification feed |
| `CallInvite.js` / `CallLog.js` | WebRTC call signaling + history |
| `NetworkingPost.js` | Networking feed posts |
| `UserReport.js` | User reports / moderation |

### `controllers/`

One folder per domain, each with `*.http.js`, optional `helpers.js` / `*.service.js`, and `index.js`:

| Folder | Files / role |
|--------|----------------|
| `auth/` | `register-login`, `password`, `two-step`, `session`, `email-verify`, `profile` |
| `users/` | `profile`, `presence`, `inbox`, `block`, `push`, `e2e`, `notifications`, `privacy`, `account`, `search`, `invites` |
| `conversations/` | `direct`, `groups`, `topics`, `invites`, `moderation`, `avatar` |
| `messages/` | `send`, `query`, `receipts`, `actions`, `threads`, `export`, `live-location`, `socket.handlers`, `send.service`, `delete.service`, `schedulers` |
| `calls/` | `call.http.js` — invites, history, ICE, socket signals |
| `status/` | `status.http.js`, `helpers.js` — stories CRUD, views, reactions |
| `search/` | `search.http.js` — people, chats, messages |
| `networking/` | `networking.http.js` — profile + posts feed |
| `ai/` | `ai.http.js` — translate + smart replies |
| `utility/` | `geoip.http.js`, `link-preview.http.js` |

**Message pipeline:** `messages/send.http.js` + `messages/send.service.js` (shared by HTTP and socket `send-message`).

### `validators/`

| File | Domain |
|------|--------|
| `auth_validator.js` | Login, register, password, 2FA |
| `user_validator.js` | Profile, push, privacy, account |
| `message_validator.js` | Send, edit, react, export |
| `conversation_validator.js` | Groups, channels, invites, moderation |
| `status_validator.js` | Status stories |
| `call_validator.js` | Call invites |
| `networking_validator.js` | Networking posts |
| `ai_validator.js` | Translate, smart replies |
| `common.js` | Shared Zod helpers |

### `services/`

| File | Role |
|------|------|
| `session-auth.js` | JWT sessions, refresh, revoke |
| `jwt-utils.js` | Token sign/verify helpers |
| `password-hash.js` | bcrypt wrappers |
| `event-bus.js` | Socket event bridge from controllers |
| `delivery-service.js` / `ack-service.js` | Message delivery + read receipts |
| `message-upload.js` | Attachment staging (`image/`, `video/`, `audio/`) |
| `object-storage.js` | Optional S3 / Cloudflare R2 uploads |
| `avatar-upload.js` / `avatar-utils.js` | User avatar pipeline |
| `conversation-avatar-upload.js` | Group/channel avatars |
| `status-upload.js` | Status media |
| `ai-local-engine.js` | Intent matching + translation dictionary |
| `dict-store.js` | SQLite-backed phrase/word lookup (`vega-dict.db`) |
| `ai-translate.js` / `ai-smart-replies.js` | HTTP layer for `/ai/*` |
| `push-notify.js` | Web Push (VAPID) |
| `mailer.js` | SMTP — password reset, email verify, login alerts |
| `notification-service.js` | In-app notifications |
| `presence-service.js` | Online / last-seen |
| `redis-client.js` / `redis-factory.js` | Optional Redis (Socket.IO adapter) |
| `redis-unread-mirror.js` | Optional unread counts in Redis |
| `call-notify.js` / `status-notify.js` / `networking-notify.js` | Domain push + socket fan-out |
| `live-location.js` | Shared live-location state |
| `conversation-permissions.js` | Who can post, invite, moderate |
| `search-normalize.js` | Search query normalization |
| `display-name-policy.js` / `username-policy.js` / `phone-hash.js` | Identity rules |
| `api-response.js` / `http-error.js` / `async-handler.js` | HTTP helpers |

### `data/` (local AI)

| File | Role |
|------|------|
| `vega-dict.db` | **Primary** — SQLite dictionary (phrases, words, smart intents). Gitignored; must exist locally for full AI. |
| `ai-supplements.json` | Extra phrases, words, and intents merged at runtime |
| `smartReplies.json` | Fallback smart-reply intents if DB has no `smart_intents` table |
| `translations.json` | Fallback phrase maps if `vega-dict.db` is missing |
| `fallbackWords.json` | Fallback word maps if `vega-dict.db` is missing |

Loading logic lives in `services/ai-local-engine.js` and `services/dict-store.js`. When `vega-dict.db` is present, translation uses SQLite and skips the large JSON fallbacks.

Generate VAPID keys (if needed): `npx web-push generate-vapid-keys`

### `socket/`

| File | Role |
|------|------|
| `index.js` | Socket.IO server, optional Redis adapter, JWT auth handshake |
| `handlers.js` | Rooms, typing, calls, live location |
| `message.handlers.js` | `send-message`, react, edit, delete |

---

## Environment variables

### Core (`config/env.js`)

| Variable | Default / notes |
|----------|-----------------|
| `NODE_ENV` | `development` |
| `JWT_SECRET` | `change-me` locally; **required** strong value (≥32 chars) in production |
| `JWT_EXPIRES_IN` | `1d` |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `vegasphere` / `vegasphere-api` |
| `BCRYPT_ROUNDS` | `10` dev, `12` prod |
| `CORS_ORIGINS` | Comma-separated; empty in prod blocks cross-origin |
| `JSON_BODY_LIMIT` / `URLENCODED_BODY_LIMIT` | `1mb` |
| `RATE_LIMIT_ENABLED` | `1` in production |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `300` |
| `TRUST_PROXY` | `1` in production |
| `ICE_SERVERS` | Google STUN default; JSON or comma-separated TURN/STUN URLs |
| `SESSION_TOUCH_THROTTLE_MS` | `60000` |
| `ALLOW_DESTRUCTIVE_MAINTENANCE` | `1` or admin role for destructive ops |

### Database & server

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `5500`) |
| `MONGO_URI` | MongoDB connection string |
| `MONGO_AUTO_INDEX` | Auto-build indexes in dev (`1` / `0`) |

### Integrations (optional)

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Socket.IO multi-node adapter + optional caches |
| `REDIS_UNREAD_MIRROR` | `1` to mirror unread counts in Redis |
| `PUBLIC_APP_URL` | Frontend base URL for email links (e.g. `http://localhost:3001`) |
| `PUBLIC_API_URL` | Absolute API URLs in avatar/media responses |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Outbound email |
| `MAIL_FROM`, `MAIL_SUBJECT_*` | From address and email subjects |
| `EMAIL_VERIFY_DEBUG` / `PASSWORD_RESET_DEBUG` | Log verify/reset links instead of sending mail |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push notifications |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Object storage (S3 / R2) |
| `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL` | Custom endpoint + public CDN URL |
| `AI_SMART_REPLY_CACHE_MS` | Smart reply cache TTL (default `30000`) |

### WebRTC calls on live networks

Local/LAN calls usually work with the default Google STUN server. For a live
demo where laptops may be on different networks, configure a TURN server in
`ICE_SERVERS`; TURN relays media when direct peer-to-peer connectivity fails.
For your Heroku university demo, the easiest free option is OpenRelay:

```env
ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:openrelay.metered.ca:80","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443?transport=tcp","username":"openrelayproject","credential":"openrelayproject"}]
```

The backend exposes this to logged-in clients at `GET /calls/ice-servers`.
If you want to prove calls use relay-only during QA, set the frontend build env
`NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY=relay` temporarily.
OpenRelay is public/free, so it is good for a small demo call, not guaranteed
for heavy production traffic.

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm start` | `node index.js` |
| `npm run dev` | `node --watch index.js` (auto-restart on file changes) |

---

## Background schedulers

`schedulers.js` runs in-process intervals:

| Interval | Job |
|----------|-----|
| 15s | Publish due scheduled messages |
| 15s | Expire disappearing messages |
| 15 min | Clean up expired staged uploads |
| 60s | Send call invite reminders |
| 60s | Expire stale ringing calls |
| 10 min | Clean up expired conversation bans |
| 30s | Re-deliver unacknowledged messages |

---

## Production notes

- Set `JWT_SECRET`, `CORS_ORIGINS`, `MONGO_URI`, and `PUBLIC_APP_URL` before deploy.
- Use `GET /ready` for health checks (503 until Mongo — and Redis if `REDIS_URL` is set — is up).
- Schedulers run in-process; coordinate before horizontal scaling (or run a single scheduler leader).
- SIGTERM / SIGINT → graceful shutdown (HTTP, Socket.IO, Redis, Mongo).
- Never commit `.env` or `.env.secrets-backup`.
