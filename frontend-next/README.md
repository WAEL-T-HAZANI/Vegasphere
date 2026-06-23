# Vegasphere Frontend (Next.js)

Next.js 14 **App Router** client for Vegasphere. TypeScript under `src/`. Talks to the Express API (default `http://localhost:5500`) via REST and Socket.IO.

**Monorepo root:** [../README.md](../README.md) · **Backend:** [../backend/README.md](../backend/README.md)

---

## Quick start

```bash
cd frontend-next
npm install
# Create .env.local (see Environment variables below)
npm run dev          # http://localhost:3001
```

Start the backend first (`cd backend && npm run dev` on port **5500**).

Minimum `.env.local`:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5500` |

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Compile service worker + dev server on **port 3001** |
| `npm run build` | Production build (`build:sw` + `next build`) |
| `npm run start` | Serve production build |
| `npm run build:sw` | Compile `src/service-worker/sw.ts` → `public/sw.js` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

`dev` and `build` always run `build:sw` first so Web Push has a fresh `public/sw.js`.

---

## How the client is wired

```
Browser
  → middleware.ts (vs_auth cookie → redirect to /login)
  → app/(shell)/layout.tsx (AppShell, auth guard, providers)
  → page components
  → lib/clients/* or lib/api.ts (REST)
  → SocketBridge + socketChatListeners.ts (realtime)
  → Redux store (auth, chat, ui)
```

**Providers** (`components/providers/`): session bootstrap, socket, theme, i18n direction, push, service worker, toasts.

**Realtime:** `SocketBridge` connects with `auth-token`; `socketChatListeners.ts` handles inbox events (messages, typing, receipts, notifications).

---

## Config files (project root)

| File | Role |
|------|------|
| `next.config.mjs` | Legacy redirects, remote image hosts, `staleTimes`, bundle import optimization |
| `tsconfig.json` | TypeScript + `@/*` → `src/*` |
| `tsconfig.sw.json` | Service worker compile target |
| `tailwind.config.mjs` | Brand tokens, dark mode |
| `postcss.config.mjs` | Tailwind PostCSS |
| `global.d.ts` | Global TS augmentations |

**Gitignored:** `.next/`, `.swc/`, `node_modules/`, `.env.local`

---

## `public/`

| Path | Role |
|------|------|
| `sw.js` | Service worker for Web Push (generated — do not edit by hand) |
| `icon.svg`, `icon-light.svg`, `icon-dark.svg` | Brand icons |
| `sounds/vega-chime.wav` | Notification chime |
| `sounds/vega-incoming-call.wav` | Incoming call ringtone |

---

## Source layout (`src/`)

Import alias: `@/*` → `src/*`.

```
src/
├── middleware.ts                 # Auth cookie gate for protected routes
├── service-worker/sw.ts          # Source for public/sw.js
├── app/
│   ├── page.tsx                  # Landing (marketing)
│   ├── (auth)/                   # /login, /signup, forgot/reset password, verify-email
│   ├── (shell)/                  # Logged-in app (see routes below)
│   ├── legal/                    # /legal/terms, /privacy, /contact
│   ├── join/[token]/             # Group/channel invite join
│   └── call/[token]/             # Guest call join link
├── components/
│   ├── chat/                     # Conversation UI, messages, composer, hooks
│   ├── chats/                    # Inbox list, DM modal, virtualized rows
│   ├── calls/                    # WebRTC overlays, history, device prefs
│   ├── channels/                 # Channel list, create, info
│   ├── groups/                   # Group list, create, info
│   ├── status/                   # Status stories feed + composer
│   ├── networking/               # Networking profile + collab board
│   ├── search/                   # Global search results
│   ├── ai/                       # Smart replies, translate panels, tour
│   ├── settings/                 # Account, appearance, push, maintenance
│   ├── privacy/                  # Blocks, E2E, 2FA, email verify
│   ├── profile/                  # Profile edit helpers
│   ├── marketing/                # Landing panels + legal page shells
│   ├── layout/                   # AppShell, nav, skeletons, auth guard
│   ├── providers/                # Bootstraps (socket, push, theme, SW, …)
│   ├── socket/                   # SocketBridge
│   ├── ui/                       # Buttons, inputs, dropdowns
│   └── …                         # auth, brand, account, conversation, media, presence
├── lib/
│   ├── api.ts                    # Axios client, auth-token, unwrap { data }
│   ├── clients/                  # Typed HTTP clients (one per backend route group)
│   ├── socket.ts                 # Socket.IO singleton
│   ├── socketChatListeners.ts    # Inbox + notification socket handlers
│   └── …                         # Domain helpers (chat*, call*, shell*, ai*, …)
├── store/                        # Redux: authSlice, chatSlice, uiSlice
├── hooks/                        # useGlobalSearch, useShellNavBadges, usePresenceBatch, …
├── i18n/                         # en.json, ar.json (RTL), client + server loaders
└── types/                        # api.ts, status.ts, shared TS types
```

### `(shell)/` routes

| Route | Page |
|-------|------|
| `/chats`, `/chats/:id` | Inbox + conversation (split layout) |
| `/chat/:id` | Conversation (alternate path) |
| `/chat/:id/info` | Conversation info / members |
| `/search` | Global search |
| `/groups` | Groups hub |
| `/channels` | Channels hub |
| `/calls` | Call history + start |
| `/status` | Status stories |
| `/networking` | Networking feed |
| `/ai-services` | AI translate + smart replies dashboard |
| `/notifications` | Notification inbox |
| `/saved` | Starred / saved messages |
| `/settings` | App settings |
| `/privacy` | Privacy & security |
| `/profile` | Own profile |
| `/user/:userId` | Public user profile |

**Legacy redirects** (`next.config.mjs` — no empty route folders needed):

| Old path | Redirects to |
|----------|----------------|
| `/contacts` | `/search` |
| `/blocked` | `/privacy` |
| `/starred` | `/saved` |
| `/ai` | `/ai-services` |

---

## `lib/clients/` (API layer)

Barrel import: `import { authClient, messageClient } from "@/lib/clients"`.

| Client | Backend prefix |
|--------|----------------|
| `authClient` | `/auth` |
| `userClient` | `/user` |
| `conversationClient` | `/conversation` |
| `messageClient` | `/message` |
| `searchClient` | `/search` |
| `statusClient` | `/status` |
| `networkingClient` | `/networking` |
| `callsClient` | `/calls` |
| `aiClient` | `/ai` |
| `notificationsClient` | `/user` (notifications) |

Lower-level HTTP: `lib/api.ts` — base URL, `auth-token` header, unwraps `{ success: true, data }`, errors via `apiError.ts`.

---

## Chat (core screen)

`components/chat/conversation/ChatConversationScreen.tsx` orchestrates the conversation UI.

| Area | Key modules |
|------|-------------|
| Send / socket | `useChatOutgoing`, `send.service` path via socket + REST |
| Attachments / voice | `useChatAttachments`, `VoiceRecorderButton`, `voiceRecorderEngine.ts` |
| Actions | `useChatConversationMessageActions` — react, pin, star, edit, delete, forward |
| Polls / schedule | `PollComposer`, `ScheduledMessagesBar` |
| E2E | `useChatE2e`, `e2eClient.ts` |
| AI in composer | `SmartReplyBar`, `ComposerTranslateButton` |
| Threads / search | `ThreadPanel`, `useChatSearch` |
| Receipts / typing | `useChatReceipts`, `useChatTyping` |

---

## Auth flow

1. Login stores JWT in `localStorage`; sets cookie `vs_auth=1` for middleware.
2. `middleware.ts` redirects unauthenticated users away from `(shell)` routes.
3. `DashboardAuthGuard` validates token client-side.
4. `SessionBootstrap` loads `/auth/me` into Redux.
5. `SocketBridge` connects Socket.IO with `auth-token`.

---

## Environment variables (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend origin for REST + Socket.IO (default `http://localhost:5500`) |
| `NEXT_PUBLIC_UPLOADS_BASE_URL` | Optional CDN/R2 base for `next/image` remote patterns |
| `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` | Optional WebRTC ICE JSON (also from `GET /calls/ice-servers`) |

**Web Push:** VAPID public key is fetched at runtime from `GET /user/push/vapid-public` (configured in `backend/.env`). A `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local` is **not required** by the app.

Do not commit `.env.local`.

---

## Dev tips

**Stale UI, webpack chunk errors, or `Cannot find module './xxxx.js'` in dev**

Stop the dev server (`Ctrl+C`), then from `frontend-next`:

```powershell
Remove-Item -Recurse -Force .next, .swc -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Force public\sw.js -ErrorAction SilentlyContinue
npm run dev
```

`public/sw.js` is regenerated on the next `npm run dev` via `build:sw`.

**Browser still shows old design?** Hard refresh: `Ctrl+Shift+R`.

**Production** — each deploy runs `npm run build` (fresh output); no manual cache wipe.

**Test account** (if MongoDB was seeded):

- `cursor.test@example.com` / `TestPass123`

---

## Production notes

- Service worker registers in production (`ServiceWorkerSetup`); push requires HTTPS (localhost exempt).
- Run `npm run build` before deploy.
- Set `NEXT_PUBLIC_API_URL` to your production API URL.
- Align with backend `CORS_ORIGINS` and `PUBLIC_APP_URL`.
- For live WebRTC demos across different networks, configure TURN in backend
  `ICE_SERVERS`; the client fetches it from `GET /calls/ice-servers`.
- `next.config.mjs` adds the API host to `images.remotePatterns` from `NEXT_PUBLIC_API_URL` automatically.
