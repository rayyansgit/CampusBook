'use client';
// Student navigation (wireframe p.3). Waitlist is hidden until the flag is on (Sprint 3).
import Link from 'next/link';
import { flags } from '@/lib/flags';
const items = [
  { href: '/browse/', label: 'Browse' },
  { href: '/bookings/', label: 'Bookings' },
  ...(flags.waitlist ? [{ href: '/waitlist/', label: 'Waitlist' }] : []),
  { href: '/me/', label: 'Me' },
];
export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 flex border-t bg-white">
      {items.map((i) => (<Link key={i.href} href={i.href} className="flex-1 p-3 text-center text-sm">{i.label}</Link>))}
    </nav>
  );
}
