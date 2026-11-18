# Setup

Everything here is copy-paste. If a step fails, paste the error into your AI assistant along with the step number.

## Part 1 - Lead only (do this FIRST; the whole team is waiting on it)

### 1. Tools (10 min)
Install: **Node.js 20 LTS**, **Git**, **VS Code**. Check: `node -v` (v20.x), `git --version`.

### 2. Put the kit in your folder and push (10 min)
Unzip so that `web/`, `supabase/`, `docs/` sit directly inside `Desktop/CampusBook`. Then:
```bash
cd ~/Desktop/CampusBook        # Windows: cd %USERPROFILE%\Desktop\CampusBook
git init -b main
git add .
git commit -m "chore: sprint 1 starter kit"
git tag s1-foundation
```
Create an **empty** repo on GitHub (no README/.gitignore). Make it **public** (GitHub Pages and branch protection are free on public repos; private needs a paid plan, and nothing secret is in the code - the Supabase anon key is public by design). Then:
```bash
git remote add origin https://github.com/<you>/campusbook.git
git push -u origin main --tags
```
Add the 4 teammates: repo -> Settings -> Collaborators.

### 3. Supabase project (15 min)
1. supabase.com -> New project `campusbook-dev`, region closest to Karachi, **save the DB password**.
2. Authentication -> Providers -> Email: enabled. **Turn OFF "Confirm email" for now** (dev only - Supabase's built-in email sender allows only a few emails per hour, which would block the whole team today). Turn it back ON, with custom SMTP, before the demo (see ROLLBACK.md, "Email limits").
3. SQL Editor: run these files **in order**, one at a time (copy-paste the contents), then `seed.sql`:
   `supabase/migrations/20261118000001_core_schema.sql` -> `...0002_auth_domains.sql` -> `...0003_rls.sql` -> `...0004_booking_functions.sql` -> `supabase/seed.sql`
4. Table Editor: you should see `resources` with 7 rows and `allowed_domains` with 2.
5. Project Settings -> API: copy **Project URL** and the **anon public** key. (The `service_role` key is secret - never share or commit it.)

### 4. GitHub settings (10 min)
- Settings -> Pages -> Source: **GitHub Actions**.
- Settings -> Secrets and variables -> Actions -> add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Settings -> Branches (or Rulesets) -> protect `main`: require a pull request, 1 approval, block force-pushes. Allow only **squash merge** (Settings -> General -> Pull Requests).
- Check the Actions tab: the first deploy should go green and give you the live URL. Then Supabase -> Auth -> URL Configuration -> set Site URL to that URL.

### 5. Run it locally and make yourself admin
```bash
cd web
cp .env.example .env.local     # Windows: copy .env.example .env.local   then paste URL + anon key
npm install
npm run dev                    # http://localhost:3000
```
Share the URL + anon key with the team in your private chat. Admin promotion (SQL Editor), after someone has registered:
```sql
update profiles set role = 'admin' where email = 'someone@iba.edu.pk';
```
(Sign-up only accepts `@khi.iba.edu.pk` = student and `@iba.edu.pk` = faculty. Fake addresses work in dev, e.g. `ali.test@khi.iba.edu.pk`.)

Post in the team chat: "Foundation is live - pull main."

## Part 2 - Everyone
```bash
git clone https://github.com/<lead>/campusbook.git
cd campusbook/web
cp .env.example .env.local     # paste URL + anon key from the lead
npm install
npm run dev
```
Open http://localhost:3000. Then read `docs/WORKFLOW.md`, and create your first branch.

## Person A only: Supabase CLI (optional)
The SQL Editor is enough today. The CLI (`npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`) is for later.
