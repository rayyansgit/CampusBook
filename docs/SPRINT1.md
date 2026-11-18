# Sprint 1 - plan (one-day sprint)

**Goal:** Sign up / login, admin creates the catalogue, booking pipeline works end to end.
**Demo-able outcome:** a student registers, browses, books a carrel (instant confirm); books Seminar 5 / Auditorium (pending); an admin approves or rejects; the student sees the result; two people can never double-book.

Times are relative to kickoff (T+0:00). Shift them to your real clock.

## Ownership (stay in your lane = no merge conflicts)

| | Person | Owns (edit freely) | Wireframes | SRS |
|---|---|---|---|---|
| **A** | ____ | `supabase/**`, `web/scripts/**`, `lib/types.ts` | - | FR-CON-01/02, FR-BKG-04..09, FR-APR-01..05, FR-CAT-08 (DB side), NFR-SEC-02 |
| **B** | ____ | `app/login`, `app/register`, `app/me`, `lib/auth.tsx`, `components/RoleGuard.tsx` | p.1-2 | FR-ACC-01..08 |
| **C** | ____ | `app/admin/layout.tsx`, `app/admin/catalog/**`, `components/admin/**` | p.14 | FR-CAT-01..06, 08 |
| **D** | ____ | `app/browse`, `app/resource`, `app/book`, `components/booking/**` | p.3-7 | FR-BKG-01..06, FR-CON-03 (nearby slots; waitlist button hidden) |
| **E** | ____ (lead/integrator) | `app/bookings`, `app/admin/approvals`, `.github/**`, `docs/**`, Trello | p.8, 13 | FR-BKG-07..09, FR-APR-03..05, 08 |

**Shared files** (`lib/supabase.ts`, `lib/errors.ts`, `lib/flags.ts`, `components/*Shell*`, `layout.tsx`, `package.json`): change only in a tiny dedicated PR, announced in chat. **Adding an npm package = announce first.**
**Need a DB change?** Ask A in chat with the exact column/function you need. Do not edit `supabase/`.

## Schedule and checkpoints

| Block | Time | What happens | Exit check |
|---|---|---|---|
| 0 Foundation | T+0:00-1:30 | E does SETUP Part 1 (push within 45 min). Others do SETUP Part 2 as soon as repo exists, read their wireframes + PROMPTS, run the app. A reviews/extends schema with the team. | Everyone can run `npm run dev`; live URL works. Tag `s1-foundation` |
| 1 Slices | T+1:30-4:00 | B: register/login/OTP. C: admin catalog list + edit form. D: browse + resource detail (read-only). E: My Bookings list + approval queue (read-only). A: tests RPCs, fixes DB asks, writes concurrency run. | **CP1** (tag `s1-cp1`): login works, admin sees/creates a resource, student sees it in Browse |
| 2 Pipeline | T+4:00-7:00 | D: booking form -> `create_booking`, result + "slot not available" screens. E: cancel, approve/reject. C: retire, categories, blackouts. B: route guards, reset password. | **CP2** (tag `s1-cp2`): book -> Confirmed; restricted -> Pending -> admin approves -> student sees Confirmed |
| 3 Harden | T+7:00-9:00 | Integration, bug bash with the SRS tests below, concurrency test, demo rehearsal, README. | **Done** (tag `s1-done`). **Freeze at T+8:30: bug fixes only.** |

At each checkpoint: E merges everything green, tags, confirms the live site works, updates Trello. If a checkpoint slips by more than 45 min, **apply the cut-line** (below) - do not extend the day.

## Cut-lines (decide now, not under pressure)
**Must (never cut):** register/login with domain check, admin create/edit resource, availability + `create_booking` auto-confirm, pending + approve/reject, cancel, My Bookings, no double-booking.
**Should (cut in this order if behind):** 1. category CRUD UI (seed only) -> 2. blackout UI (SQL-only) -> 3. password reset -> 4. browse filters beyond category chips -> 5. "nearby slots" suggestions -> 6. past-bookings tab.
**Out of Sprint 1:** waitlist, recurring, quotas, check-in, change booking, emails/reminders, reviews, complaints, reports, users admin screen.

## Definition of done (per card)
Works in the browser (you clicked it) - `npm run typecheck` + `npm run build` pass - PR reviewed by a teammate - merged (squash) - Trello card moved to Done - uses `friendlyError()` for every failure.

## Sprint 1 acceptance (from SRS section 11)
1. Student books a free carrel -> Confirmed on screen immediately, no admin queue entry.
2. Society/faculty requests Auditorium or Seminar 5 -> Pending -> admin approves one, rejects another with a reason -> requester sees both outcomes.
3. `npm run test:concurrency` -> exactly 1 success out of 50 simultaneous requests.
4. Non-IBA email cannot register.
5. Admin adds a resource and changes its approval mode with no code change.

## Risks and fallbacks
| Risk | Fallback |
|---|---|
| Nobody on the team knows Next.js/Supabase | AI-led is fine: use `docs/PROMPTS.md`; stubs show exactly what each page calls |
| Supabase email limits block sign-up testing | "Confirm email" is OFF in dev; for demo use custom SMTP, or leave off and demo with pre-made accounts |
| DB trigger blocks legitimate sign-ups | Run `rollback/...0002_down.sql`; client-side domain check stays |
| Bad migration / RPC bug | Run rollbacks in reverse order, re-run fixed migration (ROLLBACK.md) |
| A merged PR breaks the site | Revert the PR; or redeploy tag `s1-cp1`/`s1-cp2` from Actions |
| Teammate stuck >30 min with AI | Post in chat; pair up; if it blocks a Must, cut-line applies |
| Wi-Fi/Supabase down at demo | Screen recording of the happy path recorded at T+8:00 |
