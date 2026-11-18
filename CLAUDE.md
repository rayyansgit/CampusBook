# Instructions for AI coding assistants (Claude Code / Cursor / Copilot / chat)

You are helping a student team build **IBA CampusBook**. The developer may be new to these tools: explain what you are doing in plain language, make small changes, and tell them how to test each one.

## Source of truth
`docs/reference/SRS.pdf` (requirement IDs like FR-BKG-05), `docs/reference/Wireframes.pdf` (screens), `docs/SPRINT1.md` (scope). Do NOT build anything outside Sprint 1 scope (no waitlist, recurring, quotas, email notifications, reviews, complaints, reports).

## Stack and hard rules
- Next.js 14 App Router, **static export** (`output: 'export'`). So: NO server components that fetch, NO API routes, NO middleware, NO `[id]` dynamic folders. Use query params: `/resource/?id=...` read with `useSearchParams` inside `<Suspense>`. Pages that use Supabase are `'use client'`.
- TypeScript strict. Tailwind for styling. Mobile-first (360px), the admin screens are desktop.
- Supabase client: `import { supabase } from '@/lib/supabase'`. Shared types: `@/lib/types`. Show errors with `friendlyError()` from `@/lib/errors`.
- **Bookings are written ONLY via RPCs**: `create_booking`, `cancel_booking`, `decide_booking`. Availability via `get_availability`. Never `insert/update` on `bookings` from the frontend.
- Security lives in Row Level Security (database). `RoleGuard` is only UI convenience.
- Never put the service-role key in `web/`. Never commit `.env.local`.
- Never delete resources/bookings; "retire" or "cancel" instead (FR-CAT-06).
- Unfinished work goes behind a flag in `web/src/lib/flags.ts`.

## Ownership (edit only your area; ask before touching others)
See the table in `docs/SPRINT1.md`. `supabase/**` is Person A only. Shared files (`lib/*`, `components/*`, `layout.tsx`, `package.json`) change only in a small, separate PR announced to the team.

## Before saying "done"
Run in `web/`: `npm run typecheck` and `npm run build`. Both must pass. Summarise what changed and how to undo it (usually: revert the PR).
