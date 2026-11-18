'use client';
import Stub from '@/components/Stub';
// OWNER: Person C. Wireframe p.14. CRUD on categories / resources / blackouts (admin RLS allows writes).
// Retire = set status='retired' (NEVER delete a resource: FR-CAT-06).
export default function Page() {
  return <Stub title="Resource catalog" owner="C (Admin catalogue)" wireframe="p.14" uses="from('resources'|'categories'|'blackouts')" />;
}
