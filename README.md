# Vegasphere

Self-hosted real-time chat: DMs, groups, channels, receipts, media, voice messages, link previews, moderation, optional Web Push, WebRTC calls, and local AI (smart replies + translation).

| Package | Stack | Default URL |
|---------|--------|-------------|
| [`backend/`](backend/) | Node.js, Express, MongoDB, Socket.IO | `http://localhost:5500` |
| [`frontend-next/`](frontend-next/) | Next.js 14 App Router, TypeScript, Redux, Tailwind | `http://localhost:3001` |

**Detailed docs**

- Backend — API layout, controllers, env, schedulers → [`backend/README.md`](backend/README.md)
- Frontend — routes, components, lib, cache fixes → [`frontend-next/README.md`](frontend-next/README.md)

---

## Current status (June 2026)

| Area | Status |
|------|--------|
| **Auth** | Register, login, sessions, password reset, 2-step PIN, email verify |
| **Inbox / chat list** | Virtual list, filters (all / groups / channels), search panel |
| **Chat conversation** | Send, attachments, reactions, pin, star, edit, delete, forward, threads, polls, schedule, view-once, disappearing, in-chat search, media panel, selection mode |
| **Composer** | Emoji, attach, location, share contact, voice record, schedule, poll, translate, smart replies |
| **AI in chat** | Smart replies + translate via local engine (`POST /ai/*`) |
| **Calls** | WebRTC 1:1 and group mesh (beta), ICE from backend |
| **Status stories** | 24h posts |
| **Networking** | Profile posts feed |
| **Notifications** | In-app inbox + optional Web Push (VAPID on backend) |
| **i18n / RTL** | English + Arabic, theme light/dark |

**Live calls note:** local/LAN calls can use the default STUN server; live demos across different networks should configure TURN in `backend/.env` or Heroku `ICE_SERVERS`. For the university demo, OpenRelay is already documented in `backend/.env.example`.

### Two-device QA checklist

Use two browsers/devices with different test accounts:

- Device A: `cursor.test@example.com` / `TestPass123`
- Device B: `liam4@seed.vegasphere.test` / `TestPass123`

Smoke-test these before a demo:

1. Login on both devices and open the same direct chat.
2. Send text, image/file, and voice note; confirm instant delivery.
3. Check typing, delivered/read receipts, edit/delete, reactions, and reply/thread.
4. In a group/channel, tap the `@` composer button and verify mentions-only mode.
5. Share a static location, then start/stop live location from the location menu.
6. Generate E2E keys from Privacy on both accounts, then enable encryption in a DM.
7. Open Calls and check the live-call readiness card:
   - `TURN: Ready` = good for stricter real networks.
   - `TURN: Missing` = same-WiFi may work, different networks can fail.
8. Make a voice and video call between devices.
9. Enable browser push notifications and send a message while the receiver tab is backgrounded.

---

## Repository layout

```
Vegasphere/
├── README.md
├── .gitignore
├── backend/                         # Express API + Socket.IO
│   ├── index.js, database.js, schedulers.js
│   ├── config/                      # env.js, helmet.js
│   ├── middleware/, routes/, validators/
│   ├── models/                      # User, Conversation, Message, …
│   ├── controllers/                 # auth/, users/, messages/, calls/, …
│   ├── services/                    # delivery, AI engine, push, mailer, …
│   ├── socket/                      # Socket.IO server + handlers
│   ├── data/                        # Local AI (vega-dict.db + JSON fallbacks)
│   └── uploads/                     # Runtime media (gitignored)
└── frontend-next/                   # Next.js UI
    ├── next.config.mjs
    ├── src/
    │   ├── app/                     # (auth), (shell), legal, join, call
    │   ├── components/              # chat, calls, settings, marketing, …
    │   ├── lib/                     # api, clients/, socket, domain helpers
    │   ├── store/, hooks/, i18n/, types/
    │   └── service-worker/sw.ts     # → public/sw.js
    └── public/                      # icons, sounds, sw.js
```

There is no legacy `frontend/` package, root `scripts/`, or `docs/` folder in this repo.

---

## Requirements

- **Node.js** LTS
- **MongoDB** (local or `MONGO_URI`)

Optional: **Redis** (Socket scale-out, unread mirror), **VAPID** (Web Push), **SMTP** (email), **S3/R2** (uploads), **TURN/STUN** (WebRTC). **AI** runs locally from `backend/data/` — no cloud API required.

---

## Quick start (local)

### 1. Backend

```bash
cd backend
npm install
# Create backend/.env — see backend/README.md
# Restore backup if needed: Copy-Item .env.secrets-backup .env
npm run dev             # http://localhost:5500
```

Minimum `backend/.env`:

| Variable | Example |
|----------|---------|
| `JWT_SECRET` | strong secret (any non-empty string OK for local dev) |
| `MONGO_URI` | `mongodb://localhost:27017/vegasphere` |
| `CORS_ORIGINS` | `http://localhost:3001,http://127.0.0.1:3001` |
| `PUBLIC_APP_URL` | `http://localhost:3001` |

### 2. Frontend

```bash
cd frontend-next
npm install
# Create frontend-next/.env.local
npm run dev             # http://localhost:3001
```

Minimum `frontend-next/.env.local`:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5500` |

### 3. Secrets policy

- Configure **SMTP**, **VAPID**, and **MONGO_URI** once in `backend/.env` — do not regenerate or overwrite on each run.
- Keep a local backup at `backend/.env.secrets-backup` (gitignored).
- Do not commit `backend/.env` or `frontend-next/.env.local`.
- Web Push: VAPID keys live on the **backend**; the frontend fetches the public key from `GET /user/push/vapid-public`.

**Test login** (if MongoDB was seeded):

- `cursor.test@example.com` / `TestPass123`

### 4. Frontend cache fix (dev only)

If the UI looks stale or webpack throws missing-chunk errors:

```powershell
cd frontend-next
Remove-Item -Recurse -Force .next, .swc -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Force public\sw.js -ErrorAction SilentlyContinue
npm run dev
```

### 5. Production build (frontend)

```bash
cd frontend-next
npm run build
npm run start
```

Set `CORS_ORIGINS` and `PUBLIC_APP_URL` on the backend to match your deployed frontend origin.

---

## npm scripts

| Package | Command | Description |
|---------|---------|-------------|
| backend | `npm run dev` | `node --watch index.js` |
| backend | `npm start` | `node index.js` |
| frontend-next | `npm run dev` | Service worker build + Next dev on port 3001 |
| frontend-next | `npm run build` | Production build |
| frontend-next | `npm start` | Serve production build |

---

## API overview

| Prefix | Purpose |
|--------|---------|
| `/health`, `/ready` | Liveness / readiness |
| `/auth` | Register, login, 2FA, sessions, email verify |
| `/user` | Profile, inbox, presence, push, notifications, E2E |
| `/message` | Send, upload, receipts, search, threads, export |
| `/conversation` | DMs, groups, channels, topics, invites, moderation |
| `/join` | Public invite links |
| `/search` | Global search |
| `/utility` | GeoIP, link previews |
| `/status` | Status stories |
| `/ai` | Translate, smart replies (local engine) |
| `/calls` | Call invites, history, ICE servers |
| `/networking` | Networking posts feed |
| `/uploads` | Static media (`?download=1` for attachments) |

Full tables → [`backend/README.md`](backend/README.md).

---

## Frontend routes (summary)

| Route | Purpose |
|-------|---------|
| `/` | Landing / marketing |
| `/login`, `/signup` | Auth |
| `/chats`, `/chats/:id` | Inbox + conversation |
| `/chat/:id`, `/chat/:id/info` | Conversation + info |
| `/search` | Find people / start chats |
| `/groups`, `/channels` | Hub pages |
| `/calls`, `/status` | Calls and stories |
| `/networking` | Networking feed |
| `/ai-services` | AI dashboard |
| `/notifications` | Notification inbox |
| `/saved` | Starred messages |
| `/settings`, `/privacy`, `/profile` | Account |
| `/user/:userId` | Public profile |
| `/legal/*` | Terms, privacy, contact |
| `/join/:token`, `/call/:token` | Public links |

Legacy redirects (no route folders needed): `/contacts` → `/search`, `/blocked` → `/privacy`, `/starred` → `/saved`, `/ai` → `/ai-services`.

Full map → [`frontend-next/README.md`](frontend-next/README.md).

---

## Git ignore policy

| Location | Ignores |
|----------|---------|
| **Root** `.gitignore` | `node_modules`, `.env*`, `.next`, `.swc`, `backend/uploads/`, caches |
| **`backend/.gitignore`** | `node_modules`, `.env*`, `uploads/`, `data/vega-dict.db` |
| **`frontend-next/.gitignore`** | `node_modules`, `.env*`, `.next`, `.swc`, `.vercel` |

Never commit `.env`, `.env.local`, or `.env.secrets-backup`.

---

## License

Add a `LICENSE` file at the repo root if you distribute this project.
