import type { ReactNode } from 'react';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata = { title: 'IBA CampusBook', description: 'Campus resource booking' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900"><Providers>{children}</Providers></body>
    </html>
  );
}
