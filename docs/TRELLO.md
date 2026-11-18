# Trello board: "CampusBook - Sprint 1"

## Lists
`Sprint 1 Backlog` -> `To Do (today)` -> `In Progress` -> `In Review (PR open)` -> `Done (merged)` | `Blocked` | `Parking Lot (Sprint 2/3)`

## Labels
A DB (red) - B Auth (orange) - C Catalogue (green) - D Booking UI (blue) - E Bookings/Approvals/DevOps (purple) - MUST (black) - SHOULD (grey)

## Rules (30 seconds each, keeps the board honest)
- One card = one PR. Card moves when the PR state changes. Card text has the SRS id + wireframe page.
- Blocked? Move to Blocked and write who/what you need.
- Lead posts a short update comment on the Sprint card at each checkpoint (CP1, CP2, Done).

## Cards (Sprint 1)
**Foundation (E unless noted)**
- [MUST] Repo, branch protection, Pages deploy, secrets - checklist: repo public / collaborators / Pages=Actions / secrets / first deploy green / tag s1-foundation
- [MUST][A] Supabase dev project + apply 4 migrations + seed - checklist: project / email settings / migrations 0001-0004 / seed / verify 7 resources
- [MUST] Everyone runs the app locally (checklist: one item per person)

**B - Auth** (FR-ACC)
- [MUST] Register page + domain check + OTP fallback (p.2) - FR-ACC-01/02
- [MUST] Login + sign-out + redirect by role (p.1) - FR-ACC-03
- [MUST] Route guards per role - FR-ACC-04/08
- [SHOULD] Forgot / reset password - FR-ACC-03
- [MUST] Verify: non-IBA email is refused (UI + DB)

**C - Admin catalogue** (FR-CAT)
- [MUST] Catalog table + search/filters (p.14)
- [MUST] Create/edit resource form incl. approval mode + roles - FR-CAT-01/03/04
- [MUST] Retire resource (no delete) - FR-CAT-05/06
- [SHOULD] Add category - FR-CAT-02
- [SHOULD] Blackouts dialog - FR-CAT-08

**D - Student booking** (FR-BKG)
- [MUST] Browse list + category chips + search (p.3)
- [MUST] Resource detail + availability grid (p.4) - FR-BKG-01
- [MUST] Booking form -> create_booking (p.5) - FR-BKG-03/04
- [MUST] Confirmed / Pending result screen (p.6) - FR-BKG-05
- [MUST] Slot-not-available screen (p.7) - FR-BKG-06, FR-CON-03
- [SHOULD] Nearby free slots + similar resources

**E - Bookings + approvals** (FR-BKG / FR-APR)
- [MUST] My Bookings Upcoming/Past (p.8) - FR-BKG-07/08
- [MUST] Cancel booking - FR-BKG-09
- [MUST] Admin approval queue (p.13) - FR-APR-03
- [MUST] Approve / Reject with reason + requester sees reason - FR-APR-04/05/08

**A - Database & quality** (FR-CON / NFR)
- [MUST] Review schema vs SRS, list gaps
- [MUST] Support teammates' DB requests (rolling card)
- [MUST] Concurrency test passes: 50 requests -> 1 booking (acceptance #3)
- [MUST] Rollback drill: run down scripts + re-apply on dev, confirm it works

**Integration (all)**
- [MUST] CP1 verified + tag s1-cp1
- [MUST] CP2 verified + tag s1-cp2
- [MUST] Bug bash against the 5 acceptance checks (SPRINT1.md)
- [MUST] Demo project created + frozen, demo recording made
- [MUST] Tag s1-done, Sprint 1 review notes

**Parking Lot (Sprint 2/3):** Complaints & reviews - Admin reporting dashboard - Waitlist - Recurring bookings - Quotas - Email notifications/reminders - Check-in/no-show - Users & roles admin screen - Rules/quotas admin screen
