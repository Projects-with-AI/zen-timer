# AGENTS.md

## Project Overview

Zen Timer is a Pomodoro-style focus timer with visual streak tracking. Users start 30-minute focus sessions, track their consistency with a 14-day streak strip and weekly bar chart, and review session history. The app runs as a Next.js 14 App Router application deployed on Vercel with Vercel KV (Upstash Redis) for serverless session persistence.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui design tokens (CSS variables in `globals.css`)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Storage**: Vercel KV (Upstash Redis) via `@vercel/kv` SDK
- **Deployment**: Vercel (auto-deploy from `Projects-with-AI/zen-timer` GitHub repo)

## Project Structure

```
zen-timer/
├── src/
│   ├── app/
│   │   ├── api/sessions/route.ts   # REST API (GET/POST/PUT) backed by Vercel KV
│   │   ├── globals.css             # Tailwind directives + CSS custom properties
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Main dashboard (Home component)
│   ├── components/
│   │   ├── Timer.tsx               # Focus/break timer with SVG progress ring
│   │   ├── StreakView.tsx          # 14-day streak strip + summary stats
│   │   └── WeeklyChart.tsx         # Recharts bar chart of weekly sessions
│   └── lib/
│       ├── kv.ts                   # Vercel KV client + Session type (single source of truth)
│       └── utils.ts                # Tailwind cn() utility
├── scripts/
│   └── seed-kv.ts                  # One-time data migration from JSON to KV
├── data/
│   └── sessions.json               # Legacy JSON store (kept for seed script)
├── .env.local.example              # Required env vars template
├── tailwind.config.ts              # shadcn/ui-compatible theme config
├── next.config.js                  # Next.js config (images unoptimized)
└── netlify.toml                    # Legacy Netlify config (no longer primary)
```

## Key Conventions

### Session Type
The `Session` interface is defined **once** in `src/lib/kv.ts` and imported everywhere. Never duplicate it.

```typescript
interface Session {
  id: string;
  date: string;           // YYYY-MM-DD
  durationMinutes: number;
  completedAt: string;    // ISO 8601 timestamp
  label?: string;         // User-editable session name
}
```

### Storage Architecture
- **Primary**: Vercel KV via `@vercel/kv` (serverless Redis)
- **Fallback**: `localStorage` in the browser (offline mode)
- The client (`page.tsx`) always writes to localStorage first, then syncs to the API. If the API is unavailable, the app degrades gracefully with an offline banner.
- KV key: `sessions` (single key storing the full `Session[]` array)

### API Routes
- `GET /api/sessions` — Returns all sessions
- `POST /api/sessions` — Create a session (body: `{ date, durationMinutes, completedAt, label }`)
- `PUT /api/sessions` — Update a session label (body: `{ id, label }`)

### Styling
- Uses shadcn/ui CSS variable conventions (e.g., `hsl(var(--primary))`, `bg-card`, `text-muted-foreground`)
- Tailwind config extends colors and border-radius from CSS custom properties
- UI style: premium minimalist — generous border-radius (`rounded-3xl`), subtle shadows, backdrop blur on sticky header
- No component library files (shadcn/ui style is CSS-only via variables)

## Environment Variables

Required for Vercel KV (set in Vercel dashboard or `.env.local`):

| Variable | Description |
|---|---|
| `KV_REST_API_URL` | Vercel KV REST API endpoint URL |
| `KV_REST_API_TOKEN` | Vercel KV REST API write token |
| `KV_REST_API_READ_ONLY_TOKEN` | Vercel KV read-only token (optional) |

Copy `.env.local.example` to `.env.local` and fill in values, or run `vercel env pull .env.local`.

## Development

```bash
npm install
npm run dev          # Starts on http://localhost:3005
```

## Useful Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3005 |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run seed:kv` | Seed KV from `data/sessions.json` (requires `.env.local`) |

## Deployment

- **Platform**: Vercel
- **Git integration**: Auto-deploys from `main` branch of `Projects-with-AI/zen-timer`
- **Framework preset**: Next.js (auto-detected)
- **KV store**: Must be linked to the Vercel project; env vars are injected automatically

## Important Notes

- **Never commit `.env` or `.env.local`** — both are in `.gitignore`
- **Never duplicate the `Session` interface** — always import from `@/lib/kv`
- The `netlify.toml` is a legacy artifact; Vercel is the primary deployment target
- The `data/sessions.json` file is kept only for the seed script; the app does not read it at runtime
- When adding new components that use session data, import `Session` from `@/lib/kv`
