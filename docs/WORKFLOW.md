# Workflow: git + AI without breaking each other

## Branches
`main` is always deployable. Never push to it directly. Branch names: `<letter>/<thing>`, e.g. `b/login-page`, `d/booking-form`.
```bash
git checkout main && git pull
git checkout -b d/booking-form
# ... work, then:
git add -A && git commit -m "feat(book): booking form calls create_booking"
git push -u origin d/booking-form        # then open a Pull Request on GitHub
```

## The loop (small and often)
1. Pick ONE Trello card -> move to **In Progress**.
2. Branch from fresh `main`. Pull `main` into your branch at least every hour (`git pull origin main`).
3. Work with AI (see below). Commit every working step.
4. Before the PR: `cd web && npm run typecheck && npm run build`.
5. Open PR -> template filled -> card to **In Review** -> ask a teammate in chat.
6. Reviewer: run the branch (`git fetch && git checkout <branch> && npm run dev`), click through, approve. Merge with **Squash**.
7. Card to **Done**. Delete the branch.

PRs should be small (under ~300 lines). Two small PRs beat one giant one: easier review, easier undo.

## Working with AI safely
- Ask for **small steps** and an explanation. "Make the login page" is fine; "build the whole app" is not.
- **Commit before every big AI edit.** If it makes a mess: `git restore .` (discard uncommitted) or `git reset --hard HEAD` (back to last commit).
- AI must not touch files outside your area. If it wants to, stop and ask in chat.
- Do not paste secrets (service-role key, DB password) into any AI tool.
- Do not accept "it should work" - run it and click.
- Stuck more than 30 minutes? Post in chat. Do not silently burn an hour.

## Merge conflicts
Rare if you stay in your lane. If one happens: don't panic and don't force-push. Ask AI: "explain this conflict and resolve it keeping both changes", then run the app. If unsure, ask E.

## Tags = save points
E creates `s1-cp1`, `s1-cp2`, `s1-done`. Nothing is lost: any tag can be redeployed or checked out (`git checkout s1-cp1`).

## Daily comms
One group chat. Post: "starting X", "blocked on Y by Z", "merged X". Keep Trello honest: it is the single view of progress.
