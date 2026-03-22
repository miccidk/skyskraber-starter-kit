# Skyskraber Starter Kit

A starter kit for building apps with the [Skyskraber](https://www.skyskraber.dk) API. Browse statistics, explore the item catalog, view rooms, and authenticate users via OAuth 2.0 with PKCE — all from a modern React + TypeScript stack.

## Features

**Statistics Dashboard** — Live online count, leaderboards (online time, jail time, achievements, quests, activity points, messages, games), historical charts with period selection, and totals overview.

**Item & Wearable Catalog** — Browse all items and wearables with search, filters (kind, type, sex, category), sorting, market prices, sales history charts, and count-over-time charts. Canvas-rendered item previews with sprite sheet animation.

**Room Browser** — Paginated, searchable room list grouped by floor with live online counts, opening hours, level requirements, and room detail pages with canvas-rendered room previews.

**User Profiles** — OAuth 2.0 login with PKCE, avatar rendering with skin tone processing and animated wearables, profile stats, and user info display.

**Dark Mode** — Full dark/light theme support across all components with system preference detection.

## Tech Stack

| Layer          | Technology                                           |
| -------------- | ---------------------------------------------------- |
| Runtime        | [Bun](https://bun.sh)                                |
| Backend        | [Hono](https://hono.dev/) with RPC type exports      |
| Frontend       | React 19 + TypeScript                                |
| Routing        | [TanStack Router](https://tanstack.com/router)       |
| Data Fetching  | [TanStack Query](https://tanstack.com/query)         |
| Virtualization | [TanStack Virtual](https://tanstack.com/virtual)     |
| UI             | [Radix UI](https://www.radix-ui.com/) + Tailwind CSS |
| Build          | [Vite](https://vitejs.dev/)                          |

## Architecture

```
skyskraber-starter-kit/
├── server/
│   ├── index.ts              # Bun server entry point
│   ├── app.ts                # Hono API routes (proxy to Skyskraber API)
│   └── token.ts              # OAuth client credentials & app-level fetch
├── src/
│   ├── main.tsx              # React entry point
│   ├── globals.css           # Tailwind config, scrollbar styles, aura animations
│   ├── routes/               # TanStack Router file-based routes
│   │   ├── __root.tsx        # Root layout (nav, footer, scroll restoration)
│   │   ├── index.tsx         # Home page with live stats
│   │   ├── callback.tsx      # OAuth callback handler
│   │   ├── profil.tsx        # User profile (authenticated)
│   │   ├── statistik.tsx     # Statistics layout with tab navigation
│   │   ├── statistik/$tab.tsx
│   │   ├── katalog/          # Catalog browse + detail pages
│   │   └── rum/              # Room browse + detail pages
│   ├── components/           # React components
│   │   ├── ui/               # Radix-based primitives (Button, Card, Dialog, etc.)
│   │   ├── AvatarCanvas.tsx  # Full avatar renderer with animated wearables
│   │   ├── AvatarThumbnail.tsx # Compact avatar for leaderboards
│   │   ├── ItemCanvas.tsx    # Item/wearable sprite renderer
│   │   ├── RoomCanvas.tsx    # Room background renderer
│   │   ├── CatalogBrowser.tsx
│   │   ├── RoomBrowser.tsx
│   │   └── StatisticsDashboard.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── use-auth.ts       # Auth state via useSyncExternalStore
│   │   ├── use-dpr.ts        # Device pixel ratio with low-end detection
│   │   ├── use-theme.ts      # Dark mode observer
│   │   └── use-page-virtualizer.ts # Page-level virtual scrolling
│   ├── lib/                  # Utilities
│   │   ├── api.ts            # API client functions
│   │   ├── oauth.ts          # OAuth 2.0 + PKCE flow
│   │   ├── token-store.ts    # localStorage token management
│   │   ├── avatar-renderer.ts # Canvas-based avatar rendering engine
│   │   ├── skin-tone.ts      # HSL-based skin tone processing
│   │   ├── image-loader.ts   # LRU image cache with off-thread decoding
│   │   ├── image.ts          # URL resolution for API assets
│   │   ├── aura.ts           # Aura glow effects for ranked users
│   │   ├── constants.ts      # API config, type name translations
│   │   ├── query-keys.ts     # TanStack Query key factory
│   │   └── utils.ts          # cn() utility
│   ├── contexts/             # Scroll restoration provider
│   └── types/api.ts          # TypeScript types for all API responses
├── public/
│   ├── avatars/              # Avatar base images
│   ├── items/                # Fallback item images
│   ├── robots.txt
│   └── _redirects
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── package.json
```

## Prerequisites

- [Bun](https://bun.sh) v1.1+
- A Skyskraber OAuth app (create one at [skyskraber.dk](https://www.skyskraber.dk) under your profile > Developer)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/miccidk/skyskraber-starter-kit.git
cd skyskraber-starter-kit

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your OAuth client_id and client_secret

# Start development (backend + frontend)
bun run dev
```

The frontend runs on `http://localhost:5180` and proxies API requests to the backend on port `3001`.

## Development

```bash
bun run dev              # Start backend + frontend
bun run dev:client       # Frontend only (Vite)
bun run dev:server       # Backend only (Bun with hot reload)
bun run build            # Production build
bun run preview          # Preview production build
bun run typecheck        # TypeScript type checking
bun run lint             # ESLint (zero warnings policy)
bun run format           # Prettier formatting
bun run format:check     # Check formatting
```

## How It Works

The starter kit uses a **backend proxy** pattern. The Hono server (`server/`) proxies requests to the Skyskraber API, injecting OAuth client credentials server-side so secrets never reach the browser.

**Public data** (statistics, catalog, rooms) flows through the proxy with app-level Basic Auth.

**User data** (profiles) is fetched directly from the Skyskraber API using the user's OAuth access token, with automatic token refresh.

## Notes

- **Layer naming**: In the data model, `layerType: "foreground"` renders *behind* the avatar body, and `"background"` renders *in front*. This matches Skyskraber's engine convention.
- **Skin tone**: `skinTone` is a value from 0 to 1 (0.5 = neutral). Layers with `needsSkinTone: true` are color-shifted.
- **CORS**: The API allows cross-origin requests. Images require `crossOrigin = "anonymous"` for canvas skin tone processing.

## Code Quality

- **Zero `any`** — strict TypeScript with `noUncheckedIndexedAccess`
- **Zero lint warnings** — ESLint with `--max-warnings 0`
- **Absolute imports only** — all imports use `@/` prefix
- **End-to-end type safety** — Hono RPC provides typed API clients from backend to frontend

## API Documentation

For full API documentation, see the [Skyskraber Developer Docs](https://skyskraber.dk/developers).

## Copyright Notice

All graphics, avatars, items, wearables, room assets, and other visual content served by the Skyskraber API are copyright [Skyskraber](https://www.skyskraber.dk). These assets are provided for use within the Skyskraber ecosystem and may not be redistributed, modified, or used outside of applications that interact with the Skyskraber platform.

The starter kit source code itself is MIT licensed — see below.

## License

MIT — see [LICENSE](LICENSE) for details.
