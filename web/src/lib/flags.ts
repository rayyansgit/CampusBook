// Feature flags = the "undo switch". Anything half-finished is hidden behind a flag, so main always deploys.
// Flip via env (NEXT_PUBLIC_FLAG_*) in .env.local or deploy.yml - no code change needed.
const on = (v?: string) => v === 'true';
export const flags = {
  waitlist: on(process.env.NEXT_PUBLIC_FLAG_WAITLIST),   // Sprint 3
  recurring: on(process.env.NEXT_PUBLIC_FLAG_RECURRING), // Sprint 3
  quotas: on(process.env.NEXT_PUBLIC_FLAG_QUOTAS),       // Sprint 3
};
