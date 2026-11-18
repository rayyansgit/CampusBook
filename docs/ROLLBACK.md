# Rollback and recovery runbook

Principle: **every change must be undoable in under 5 minutes.** Code is in git; the dev database is disposable and rebuildable from `supabase/`.

## 1. I broke my own branch
```bash
git status                       # see what changed
git restore .                    # throw away UNCOMMITTED changes
git reset --hard HEAD            # back to last commit (uncommitted work lost)
git reset --hard origin/<branch> # back to what is on GitHub
```

## 2. A merged PR broke `main`
Fastest: GitHub -> the PR -> **Revert** button -> merge the revert PR. (Squash merge = one commit, so revert is clean.)
CLI: `git revert <commit-sha>` then push via a PR.
Meanwhile keep the live site working: **Actions -> Deploy to GitHub Pages -> Run workflow -> ref = `s1-cp1`** (last good tag). Redeploys the old version in ~2 minutes; no code change needed.

## 3. A half-finished feature is in `main`
Hide it: set its flag to `false` in `web/src/lib/flags.ts` / deploy.yml env. No revert needed.

## 4. Database problem (Person A)
Each migration has an undo in `supabase/rollback/`.
- Bad function/policy: run the matching `...down.sql`, fix the migration file, run the migration again.
- Everything is a mess: in the SQL Editor run all rollback files **newest first** (0004 -> 0003 -> 0002 -> 0001), then migrations oldest first, then `seed.sql`. This **deletes all dev data** - fine for dev, never for the demo project.
- Signup rejected unexpectedly: run `rollback/20261118000002_down.sql` (removes the domain trigger). The client-side check still blocks non-IBA emails in the UI. Then fix and re-run migration 0002.
- Before any risky change, tell the team; they may lose test data.
- Migrations are **never edited after the team has applied them** once Sprint 1 is past CP1: add a new numbered file instead (`20261118000005_fix_x.sql`) plus its down file.

## 5. Email limits (Supabase built-in sender)
Symptom: sign-up fails with "email rate limit exceeded". Dev: keep "Confirm email" OFF. Demo: Auth -> SMTP Settings -> custom SMTP (Resend free tier, or Gmail app password) then turn "Confirm email" ON and set the 6-digit code template (use `{{ .Token }}`). Fallback: demo with pre-created accounts.

## 6. Demo project
Before the demo create a second Supabase project `campusbook-demo`, apply migrations + seed there, point the deploy secrets at it, and **freeze** it (nobody experiments there). If the dev project dies, switch the two GitHub secrets back and redeploy.

## 7. Last-resort fallbacks for demo day
- Run locally (`npm run dev`) against the demo project if Pages is down.
- Pre-recorded screen capture of the happy path (record at T+8:00).
- Slide with screenshots of each Sprint 1 screen.

## Secrets leaked?
Anon key leaking is OK (public by design). If the **service-role key or DB password** was committed or pasted anywhere: Supabase -> Settings -> API / Database -> reset it immediately, tell the team.
