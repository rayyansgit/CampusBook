import Stub from '@/components/Stub';
// OWNER: Person B (Auth). Wireframe p.2. FR-ACC-01/02. Check domain against allowed_domains first, then signUp, then 6-digit OTP verifyOtp.
export default function Page() {
  return <main className="mx-auto max-w-md p-4"><Stub title="Register + verify email" owner="B (Auth)" wireframe="p.2" uses="supabase.auth.signUp / verifyOtp" /></main>;
}
