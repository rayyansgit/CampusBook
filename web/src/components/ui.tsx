'use client';
// Shared building blocks so every page looks the same. Keep this file small.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { BookingStatus } from '@/lib/types';

/** Input styling without a width: add your own (w-auto, w-48 ...). */
export const inputBase =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100';
export const inputCls = `w-full ${inputBase}`;

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800',
  secondary: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
  danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
  ghost: 'text-gray-700 underline-offset-2 hover:underline',
};

export function Button({
  variant = 'primary', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-800">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'info' | 'success'; children: ReactNode }) {
  const cls = {
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-green-200 bg-green-50 text-green-800',
  }[kind];
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function PageHeader({ title, back, action }: { title: string; back?: string | true; action?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="mb-4 flex items-center gap-3">
      {back === true && (
        <button onClick={() => router.back()} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white">&lsaquo;</button>
      )}
      {typeof back === 'string' && (
        <Link href={back} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white">&lsaquo;</Link>
      )}
      <h1 className="flex-1 text-xl font-semibold">{title}</h1>
      {action}
    </header>
  );
}

export function Loading({ label = 'Loading...' }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-gray-500">{label}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{children}</p>;
}

const statusStyle: Record<BookingStatus, [string, string]> = {
  confirmed: ['Confirmed', 'border-green-300 bg-green-50 text-green-800'],
  pending_approval: ['Pending', 'border-amber-300 bg-amber-50 text-amber-800'],
  rejected: ['Rejected', 'border-red-300 bg-red-50 text-red-800'],
  cancelled: ['Cancelled', 'border-gray-300 bg-gray-100 text-gray-600'],
  completed: ['Completed', 'border-gray-300 bg-white text-gray-700'],
  no_show: ['No-show', 'border-gray-300 bg-gray-100 text-gray-600'],
  expired: ['Expired', 'border-gray-300 bg-gray-100 text-gray-600'],
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const [label, cls] = statusStyle[status];
  return <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' }) {
  const cls = {
    gray: 'border-gray-300 bg-white text-gray-700',
    green: 'border-green-300 bg-green-50 text-green-800',
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    red: 'border-red-300 bg-red-50 text-red-800',
  }[tone];
  return <span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export const roleLabel: Record<string, string> = {
  student: 'Student', faculty: 'Faculty / Staff', society: 'Society organizer', admin: 'Admin',
};
