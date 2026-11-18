# IBA CampusBook

Centralized campus resource booking for IBA Karachi. 
Student project (ERP: 30530, 31629, 30598, 30483, 30537)

|    Layer   |                       Tech                         |
|------------|----------------------------------------------------|
|  Frontend  | Next.js 14 (static export) + TypeScript + Tailwind |
|   Backend  | Supabase (Postgres + Auth + Row Level Security)    |
|   Hosting  | GitHub Pages (auto-deploy from `main`)             |

## Read in this order
1. `docs/SETUP.md` - get it running on your machine (lead does Part 1 once, everyone does Part 2)
2. `docs/SPRINT1.md` - who owns what, schedule, checkpoints, cut-lines
3. `docs/WORKFLOW.md` - git rules + how to work with AI without breaking each other
4. `docs/ROLLBACK.md` - what to do when something breaks
6. `docs/reference/` - Proposal, SRS, Wireframes (the source of truth)

## Layout
```
web/                 Next.js app (src/app = pages, src/lib = shared code)
supabase/migrations  Database schema + booking functions (Person A owns)
supabase/rollback    Undo script for every migration
supabase/seed.sql    Demo data
.github/workflows    CI on PRs, deploy on main
docs/                Plans, runbooks, references
```
