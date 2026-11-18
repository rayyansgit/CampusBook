# Starter prompts (paste into your AI tool)

## Opener - paste this at the start of EVERY session
> I'm on a student team building IBA CampusBook. I'm new to Next.js and Supabase, so explain in plain language and go in small steps. First read `CLAUDE.md` and `docs/SPRINT1.md` in this repo. I'm Person <LETTER>. Only edit files in my area. My card is: "<paste Trello card>". Wireframe: <page numbers from docs/reference/Wireframes.pdf>. Before finishing, run `npm run typecheck` and `npm run build` in `web/`, and tell me exactly how to test it in the browser and how to undo it.

## Person A - database
> Review `supabase/migrations` against SRS sections 4.3-4.5 and 8. List gaps or bugs, don't change anything yet. Then, for each teammate request I paste, write a NEW numbered migration + a matching `rollback/` file, and test it by reasoning through edge cases (concurrent bookings, back-to-back, timezone Asia/Karachi). Also help me run `npm run test:concurrency` against the dev project.

## Person B - auth (wireframes p.1-2)
> Build `/login` and `/register` per the wireframes using Tailwind. Register: validate the email domain against the `allowed_domains` table before calling `supabase.auth.signUp` (store `full_name` in user metadata). The dev project has "Confirm email" OFF so signUp returns a session straight away; if it returns no session, show the 6-digit code box and call `verifyOtp({email, token, type:'signup'})`. Handle both. Show errors with `friendlyError()`. After login, redirect admins to `/admin/approvals/` and everyone else to `/browse/`. Add "Forgot password" (`resetPasswordForEmail`) last.

## Person C - admin catalogue (wireframe p.14)
> Build `/admin/catalog` (desktop layout): a table of resources (join `categories`), search + category/status filters, and a side form to edit/create a resource with the fields in the wireframe (name, category, capacity, building, location, rules text, hours, min/max, slot, advance, buffer, approval Category/Auto/Required, allowed roles). Save with supabase `insert`/`update` on `resources`. "Retire" sets `status='retired'` - never delete. Approval "Category" = `approval_mode = null`. Then add "+ Category" and "+ Blackout" dialogs (blackout writes `blackouts`; times entered in Pakistan time, stored as UTC ISO strings).

## Person D - student booking (wireframes p.3-7)
> Build `/browse` (list with category chips + search, a "Free now / Approval / Busy" badge), `/resource/?id=` (details + day tabs + hourly availability grid from `rpc('get_availability')`, colours: free/booked/hold/blocked), and `/book/?id=` (date, start, end, attendees, purpose required if the resource needs approval). Submit with `rpc('create_booking', {...})`. Times are entered in Pakistan time (UTC+5) and sent as UTC ISO. On success show the "Confirmed" or "Pending approval" screen with the booking reference; on `SLOT_TAKEN` show the "Slot not available" screen (waitlist button hidden unless `flags.waitlist`). Use `friendlyError()` for all other errors. Start read-only (browse + detail) before the form.

## Person E - bookings + approvals (wireframes p.8, p.13) + repo
> Build `/bookings` (Upcoming/Past tabs from `bookings` joined to `resources`; status pill; Cancel button -> `rpc('cancel_booking')`; show the rejection reason on rejected cards) and `/admin/approvals` (table of `pending_approval` bookings with resource, when, requester name/role, waiting time; side panel with purpose, note box, Approve/Reject -> `rpc('decide_booking')`, reject requires a note). Join `profiles` for requester info. Hide Check-in/Change/Rate/Report (later sprints).

## Debugging prompt (anyone)
> This is the error / behaviour: <paste>. This is the file: <paste>. Explain the cause in simple words first, then give the smallest fix. Do not refactor anything else.
